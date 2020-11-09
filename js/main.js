//Global definitions and functions
//--------------------------------------------------------------------------------------------

//Set to true, this should work in Chrome if for instance you have an extension to disable CORS
//*Depecrated, now uses .js files because of CORS
const GOOGLE_DRIVE_DATA = false;

try {
    const INFORM_VERBOSE = true; //Console logging enabled, then alias 'inform' below
    // if (INFORM_VERBOSE) var inform = console.log.bind(window.console)
    if (INFORM_VERBOSE) {
            var inform = console.log.bind(window.console)
    } 
    else var inform = function(){}
}
catch (err){
    alert("Logging unavailable, Error: " + err);
}

// Array Remove - By John Resig (MIT Licensed)
Array.prototype.rem = function(from, to) {
    var rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
};

// check if object is a string, Orwellophile (stackoverflow) 
function isString(x) {
    return Object.prototype.toString.call(x) === "[object String]"
}



//--------------------------------------------------------------------------------------------

//Our namespace to prevent interferring with other libraries or the window namespace
const COVID_SANDBOX_NS = {

    point: function(x,y){this.x=x; this.y=y;},


    // region_list:[[]],  //Unique regions avaiable in our dataset, organized by dataset
    regions_of_interest:[],
    first_regions_index:[], //Just some variables for the first region in our data to use for JSXGraph's starting axes, etc.
    //^ need to check if these two are still used

    max_date: 0, //Number of days of records
    max_affected: {}, //Highest deaths / cases
    board: NaN,
    rolling_day_average_enabled: true,
    rolling_day_value: NaN,

    region_context: "US",
    affected_context: "Cases",

    //Pre ES6 classes, _obj's are JSXGraph references:
    graph_status_obj: function(_region_obj, _data_obj, _rolling, _color) {
        this.region_obj = _region_obj; //JSXGraph for region label on graph
        this.graph_data_obj = _data_obj; //JSXGraph for graph data
        this.rolling_day_avg = _rolling; //Bool setting for rolling data (enabled/disabled)
        this.color = _color; //Color of JSXGraph region label
    },

    graphs: [],

    // Just some colors
    custom_colors: [
        '#3348FF', //blue
        '#9133FF', //purple
        '#59FF33', //green
        '#FFB433', //brown
        '#33FFF4', //cyan
        '#E433FF'  //magenta
    ],

    //Object for keeping track of the column names for the different datasets.
    header_obj: function(_filename) {
        switch (_filename) {
            case 'covid19_deaths_US_rate':
                this.affected_column = "Deaths (Per Capita)";
                this.region_context = 'US';
                this.region_column = 'Province_State';
                break;
            case 'covid19_confirmed_US_rate':
                this.affected_column = "Cases (Per Capita)";
                this.region_context = 'US';
                this.region_column = 'Province_State';
                break;
            case 'covid19_deaths_global_rate':
                this.affected_column = "Deaths (Per Capita)";
                this.region_context = 'global';
                this.region_column = 'Country/Region';
                break;
            case 'covid19_confirmed_global_rate':
                this.affected_column = "Cases (Per Capita)";
                this.region_context = 'global';
                this.region_column = 'Country/Region';
                break;
            default: //unused
                this.region_context = 'US';
                this.region_column = 'Province_State';
                this.affected_column = "Cases (Per Capita)";
                break;
        }
        this.date_column = "Date"
    },

    //Object class for different datasets
    affected_data_template: function(_filename, _data) {
        var data2 = _data; //this is a required buffer between data & _data
        var columns2 = new this.header_obj(_filename);
        var obj = {
            [_filename]:{data: data2,
                        columns: columns2,
                        region_list: -1
            },
        }

        return obj;
    },

    region_data_template: function(_filename, _data) {
        var data2 = _data; //this is a required buffer between data & _data <- need to check if these are needed for this version of the template
        var columns2 = new this.header_obj(_filename);
        this.regions_of_interest.push({data:data2, columns:columns2});
        return this.regions_of_interest.length-1; //return our index
    },


    //Just to make accessing data columns less ugly and inconsistent:
    us_death_rate : "covid19_deaths_US_rate",
    us_case_rate : "covid19_confirmed_US_rate",
    global_death_rate : "covid19_deaths_global_rate",
    global_case_rate : "covid19_confirmed_global_rate",

    //Return dataset context
    get_context: function() {
        if (this.region_context == "US") {
            if (this.affected_context == "Cases") return this.us_case_rate;
            else return this.us_death_rate;
        }
        else {
            if (this.affected_context == "Cases") return this.global_case_rate;
            else return this.global_death_rate;
        }
    },

    set_context: function(_region, _affected) {
        if (_region.toUpperCase() == "US") { //.toUpperCase just to avoid any case mistakes
            _region = "US"; 
            $("#region_context_us").attr('checked', 'checked');
            $("#region_context_global").not('checked', false);
        }
        else {
            _region = "Global"
            $("#region_context_global").attr('checked', 'checked');
            $("#region_context_us").attr('checked', false);
        }


        if (_affected.toUpperCase() == "CASES") {
            _affected = "Cases";
            $("#affected_context_cases").attr('checked', 'checked');
            $("#affected_context_deaths").attr('checked', false);
        }
        else {
            _affected = "Deaths";
            $("#affected_context_deaths").attr('checked', 'checked');
            $("#affected_context_cases").attr('checked', false);
        }

        this.region_context = _region;
        this.affected_context = _affected;
    },

    affected_data:{}, //Array of deaths / cases
    //affected_data[i] where i is the dataset
    //->              .[filename].data[index][column_name] //actual records
    //->              .[filename].columns.affected_column //deaths or cases column name
    //->              .[filename].columns.region_context //US or world
    //->              .[filename].columns.region_column //State / Country column names
    //->              .[filename].columns.date          //date column name
    //->              .[filename].region_list          //list of unique sub-regions
    

    //Main data loading function from Google Drive and applies data to page as well as initalizing graph
    process_data: function(_filename, _data) {
        "use strict";
        // this.affected_data = _data;
        var new_dataset = this.affected_data_template(_filename, _data);
        inform(this.region_context);
        // inform(this.affected_data);
        // this.affected_data.push(new_dataset);
        // this.affected_data.push({});
        Object.assign(this.affected_data, new_dataset);

        inform(this.affected_data);
        inform(this.affected_data[_filename]);

  

        this.affected_data[_filename].region_list = this.find_unique_regions(this.affected_data[_filename].data, this.affected_data[_filename].columns.region_column);
        // inform(region_list)
        // inform(region_list[0])

        // inform(temp)



        function sortFunction(_a, _b, _column_name) {
            if (_a[_column_name] === _b[_column_name]) {
                return 0;
            }
            else {
                return (_a[_column_name] < _b[_column_name]) ? -1 : 1;
            }
        }

    
    },



    //Create a blank graph with dimensions defined by the first region's data (Alabama)
    initialize_graph: function() {

        // this.regions_of_interest.pop();
        var context = this.get_context();
        inform (context);
        inform(this.affected_data[context]);

        var _parent_data = this.affected_data[context];
        this.fill_regions_dropdown(_parent_data.region_list);
        var _region_column = _parent_data.columns.region_column;
        var _data = this.affected_data[context].data;
        this.create_region_of_interest(_data[0][_region_column], context);
        inform(_data[0][_region_column]);

        var _affected_column = _parent_data.columns.affected_column;
        this.max_affected = this.get_max_base_affected(0, _affected_column);
        this.max_affected.y = this.max_affected.y + this.max_affected.y / 5;

        inform(this.max_affected)

        inform(this.regions_of_interest[0].data["Date"]);
        // inform(this.regions_of_interest[0][this.regions_of_interest[0].length-1]["Date"]);


        //this.max_date = Math.floor((this.regions_of_interest[0][this.regions_of_interest[0].length-1]["Date"] - this.regions_of_interest[0][0]["Date"])/(1000*3600*24));
        this.max_date = this.regions_of_interest[0].data.length

        // this.board = JXG.JSXGraph.initBoard('jsxgbox', {boundingbox:[-5,5,5,-5], axis:true, showNavigation:true, showCopyright:true});

        JXG.Options.text.display = 'internal'; //~ needed for text to work on webkit / firefox
        inform(JXG.Options);

        JXG.Options.text.cssClass = 'jsxgDefaultFont';

        this.board = JXG.JSXGraph.initBoard('jsxgbox', {
            boundingbox: [-50,this.max_affected.y,this.max_date+20,-.0005],
            //keepaspectratio: true,
            showcopyright: false,
            axis: true,
            renderer: 'canvas',
            defaultAxes: {
                x: {
                    strokeColor: 'grey',
                    ticks: {
                        visible: 'inherit',
                    }
                },
                y: {
                    strokeColor: 'grey',
                    ticks: {
                        visible: 'inherit',
                    }
                },
            },
            zoom: {
                factorX: 1.15,
                factorY: 1.15,
                wheel: true,
                needshift: false,
                min: 0.1
            },
            pan: {
                needTwoFingers: true,
                needShift: false
            },
    
            showZoom: false,
            showNavigation: false,
        });
        
        // this.board.attr.pan.enabled = true;
        // this.board.mode = JXG.Board.;
        inform(this.board.mode);

        // brd.setBoundingBox([-1,maxY*1.01,maxX*1.05,minY*0.95]);
        var x = [...Array(this.max_date).keys()];
        var y = this.extract_affected(this.regions_of_interest[0].data, this.regions_of_interest[0].columns.affected_column);


        this.board.update();
        this.regions_of_interest.pop(); //remove Alabama from our list.
    },


    //Create namespace's regions_of_interest and calls constructor for graph_stats_obj where each graph's information is stored (including JSXGraph's)
    add_region_to_graph: function(_region_of_interest_index) {
        _selected_region = this.regions_of_interest[_region_of_interest_index]
        inform(_selected_region);
        this.max_affected = this.get_max_base_affected(_region_of_interest_index, _selected_region.columns.affected_column);
        var max_affected_graph = this.max_affected.y + this.max_affected.y / 5;
        // inform(this.max_affected);

        this.max_date = this.regions_of_interest[_region_of_interest_index].data.length
        this.board.setBoundingBox([-50,max_affected_graph,this.max_date+20,-.0005]);
        // inform(this.board);

        var x = [...Array(this.max_date).keys()];
        var y = this.extract_affected(_selected_region.data, _selected_region.columns.affected_column);

        var my_color = this.custom_colors[_region_of_interest_index % this.custom_colors.length];

        inform(_selected_region);
        var region_txt = _selected_region.data[0][_selected_region.columns.region_column];


        var graph_index = this.graphs.length; //since we check it before the push() it will equal current .length

        // var p0 = this.board.create('point', [0,0], {name:'T'});


        var region_txt_obj = this.board.create('text', [
            //X,Y value:
            this.max_affected.x,this.max_affected.y,
            // COVID_SANDBOX_NS.get_max_graph_affected(Number(graph_index)).x,
            // COVID_SANDBOX_NS.get_max_graph_affected(Number(graph_index)).y + COVID_SANDBOX_NS.get_max_graph_affected(Number(graph_index)).y / 5,
            region_txt + '(' + this.affected_context + ')'
            ], {
            anchorX: "middle",
            anchorY: "bottom", // <- should be top, but jsgx does opposite of what I expect.
            cssClass: "myFont",
            fontsize: 18,
            strokeColor: my_color,
            dragToTopOfLayer: true,
            // fixed: true // works
        });

        // var txt = this.board.create('text', [0,0, " <span id='par'>(</span> Hello world <span id='par'>)</span>"], 
        //   {
        //     cssClass:'myFont', strokeColor:'red',
        //     highlightCssClass: 'myFontHigh',
        //     fontSize:20
        //   });

        

        var graph = this.board.create('curve', [x,y], {
            // name: String(_selected_region[0]["Province_State"]),
            // id: String(_selected_region[0]["Province_State"]),
            // label:{autoPosition: true, offset:[0, 0], anchorX: 'middle', anchorY: 'middle'},
            strokeColor:my_color,
            fillColor:my_color, 
            fillOpacity:.5, 
            name:"curve", 
            strokeWidth:1.5,
            fixed: true
            // dragToTopOfLayer: true
        });
        inform(graph);
        construct = new this.graph_status_obj(region_txt_obj, graph, -1, my_color); // set rolling avg to -1 so its updated later

        this.graphs.push(construct);
        
        this.add_tidy_endpoints(this.graphs[graph_index].graph_data_obj);

        if (this.rolling_day_average_enabled)
            this.update_rolling_average();
        else 
            this.board.update(); //required to update graph coordinate  
        
    },

    
    update_region_label: function(index) {
        var _selected_graph_region = this.graphs[index];
        this.max_affected = this.get_max_graph_affected(index);
        _selected_graph_region.region_obj.setCoords(this.max_affected.x,this.max_affected.y);
        
    },

    //Actual algorithm that applies the rolling average to data
    transform_range: function(data, breadth) {
        var range = [];
        var parent_result_array = []

        //Inline function to account for rangle mutations at beginning and end of array
        function average_across_range(data, x, breadth) {
            breadth = Math.floor(breadth / 2);
            var start = x - breadth;
            var end = x + breadth;
            
            if (start < 0) { 
                x_left_divisor = x;
                start = 0;
            }
            else x_left_divisor = breadth

            if (end > data.length) {
                x_right_divisor = data.length - x;
                end = data.length;
            }
            else x_right_divisor = breadth
           
            var total = 0;
            for (var i = start; i < end; i++)
                total += data[i];

            return total / (x_left_divisor + x_right_divisor); 
        }
    
        for (var i = 0; i < data.length; i++) {
            range = average_across_range(data, i, breadth);
            // inform(range);
            parent_result_array.push(range);
        }
        return parent_result_array;
    },

    //Helper function for particular graph data resetting to regions_of_interest and calls transform_range to apply rolling average
    apply_rolling_average: function(index) {
            this.remove_tidy_endpoints(this.graphs[index].graph_data_obj)
            this.graphs[index].graph_data_obj.dataX = [...Array(this.max_date).keys()];
            this.graphs[index].graph_data_obj.dataY = this.extract_affected(this.regions_of_interest[index].data, this.regions_of_interest[index].columns.affected_column); //we need to extract data before next line
            this.graphs[index].graph_data_obj.dataY = this.transform_range(this.graphs[index].graph_data_obj.dataY, this.rolling_day_value);
            this.add_tidy_endpoints(this.graphs[index].graph_data_obj);
            
    },

    //Return affected people (deaths or cases data) 
    extract_affected: function(data, column) {
        var y = [];
        inform(data);
        inform(column)
        for (var i = 0; i < data.length; i++) {
            y.push(data[i][column]);
            // inform(data[i])
        }
        return y;
    },

    //Globally updates rolling average changes after a change
    update_rolling_average: function(changed) {
        
        if (this.rolling_day_average_enabled) {
            for (var i = 0; i < this.graphs.length; i++) {
                if (this.graphs[i].rolling_day_avg != this.rolling_day_value || changed) {
                   
                    this.apply_rolling_average(i);
                    // this.graphs[i].region_txt = this.board.create('text', [this.max_affected.x,this.max_affected.y, _selected_region[0]["Province_State"]], {fontSize:18, color: my_color});
                    // inform(this.graphs[i].region_obj);
                    this.graphs[i].rolling_day_avg = this.rolling_day_value;
                    this.update_region_label(i);
                }
            }
        }
        else {
            for (var i = 0; i < this.graphs.length; i++) {
                if (this.graphs[i].rolling_day_avg != this.rolling_day_value || changed) {

                    this.graphs[i].graph_data_obj.dataX = [...Array(this.max_date).keys()];
                    this.graphs[i].graph_data_obj.dataY = this.extract_affected(this.regions_of_interest[i], this.regions_of_interest[i].columns.affected_column);
                    this.add_tidy_endpoints(this.graphs[i].graph_data_obj);
                    this.graphs[i].rolling_day_avg = this.rolling_day_value;
                    this.update_region_label(i);

                }
            }
        }


        this.board.update();
    },


    //This function is just to make the fillcolor look correct/good
    add_tidy_endpoints: function(graph) {
        // inform(graph)
        graph.dataX.splice(0, 0, 0); //insert 0 x & value at start of array
        graph.dataY.splice(0, 0, 0); 
        graph.dataX.push(graph.dataX.length-2); //append a duplicate x value and a 0 y value at the end of our data 
        graph.dataY.push(0);
        // return graph;       
    },

    //This function is to remove the added tidy points
    remove_tidy_endpoints: function(graph) {
        graph.dataX.rem(0);
        graph.dataX.rem(-1); 
        graph.dataY.rem(0);
        graph.dataY.rem(-1); 
        // return graph;       
    },

    fill_regions_dropdown: function(_data) {
        "use strict";
        var dropdown = $('#regions_dropdown');

        if (isString(_data) == false) {
            $.each(_data, function(val, text) {
                // inform(val, text)
                dropdown.append($('<option></option>').val(val).html(text));
            });
        }
        else  dropdown.append($('<option></option>').val(_data).html(_data));
    },

    //Get a list of unique regions
    find_unique_regions: function(_region, _column_name) {
            //Data structure of     affected_data:[]
        inform(_column_name);
        "use strict";
        var _data = _region;
        var _region_list = [];
        var _last_region = "";
        var _check_region = "";
        for (var i = 1; i < _data.length; i++) { //start at one to skip header
            _check_region = _data[i][_column_name];

            if (_check_region == _last_region) continue; //non-unique region
            // inform(_check_region);
            _region_list.push(_check_region); //unique region
            _last_region = _check_region;
        }
        return _region_list;         
    },

    
   //Generates the time series for a specific region in parent scope: regions_of_interest then returns the index for it
   create_region_of_interest: function(_region, context) {
    "use strict";

    // var context = this.get_context();
    var index_of_last_region = this.regions_of_interest.length-1;
    var _parent_data = this.affected_data[context];
    // this.fill_regions_dropdown(_parent_data.region_list);
    var _region_column = _parent_data.columns.region_column;
    var _affected_column = _parent_data.columns.affected_column;
    var _data = this.affected_data[context].data;
    
    var data_buffer = [];
    // this.create_region_of_interest(_data[0][_region_column]);

    // var _region_data = this.affected_data_template(context, _data);

    var _to_number = [_affected_column, "Lat", "Long_", "Population"]; //Long is renamed to Long_ by js or csv reader
    var _to_date = "Date";

    var _check_region = "";
    var counter = 0;
    var already_alerted = false;
    for (var i = 0; i < _data.length; i++) { //no header
        // _check_region = _data[i]['Province_State'];
        _check_region = _data[i][_region_column];

        if (_check_region != _region) continue; //skip unmatching regions
        if (_data[i][_affected_column] == -1) {
            if (!already_alerted) {
                // alert("Dataset for region:" +_data[i]['Province_State'] + " incomplete at index:" + i)
                alert("Dataset for region:" +_data[i][_region_column] + " incomplete at index:" + i)
                already_alerted = true;
            }
            // delete this.regions_of_interest[index_of_last_region];
            this.regions_of_interest.pop(); //delete
            return -1
        }
        
        data_buffer.push(_data[i]);
        
        //convert strings from our table that should be numbers to numbers
        for (var i_2 = 0, len = _to_number[i_2].length; i_2 < len; i_2++) { 
            data_buffer[counter][_to_number[i_2]] = Number(data_buffer[counter][_to_number[i_2]])
        }
        //convert dates to date types
        data_buffer[counter][_to_date] = new Date(data_buffer[counter][_to_date]);
        counter ++;
    }
   

    this.region_data_template(context, data_buffer);

    return this.regions_of_interest.length-1;

    // inform(this.regions_of_interest);

   },
    // //Generates the time series for a specific region in parent scope: regions_of_interest then returns the index for it
    // create_region_of_interest: function(_region) {
    //     "use strict";
    //     // this.regions_of_interest.push([]); //append empty array for a new region list to our list of regions_of_interest
    //     // var index_of_last_region = this.regions_of_interest.length-1;
    //     // inform(index_of_last_region)
    //     // var _list_by_region = this.regions_of_interest[index_of_last_region];
    //     // var context = this.get_context();
    //     // var _affected_column = this.affected_data[context].columns.affected_column;
    //     // var _region_column = this.affected_data[context].columns.region_column;
    //     // // var _to_number = ["Deaths (Per Capita)", "Lat", "Long_", "Population", "Reported Deaths"] //Long is renamed to Long_ by js or csv reader
    //     // var _to_number = [_affected_column, "Lat", "Long_", "Population"] //Long is renamed to Long_ by js or csv reader
    //     // var _to_date = "Date"
    //     // var _data = this.affected_data[context].data;
    //     // var already_alerted = false;


    //     var _data = this.affected_data_template(_filename, this.affected_data[this.affected_data]);
    //     inform(this.region_context);
    //     // inform(this.affected_data);
    //     // this.affected_data.push(new_dataset);
    //     // this.affected_data.push({});
    //     Object.assign(this.regions_of_interest, new_dataset);

    //     inform(this.affected_data);
    //     inform(this.affected_data[_filename]);

        
    //     var _check_region = "";
    //     var counter = 0;
    //     for (var i = 0; i < _data.length; i++) { //no header
    //         // _check_region = _data[i]['Province_State'];
    //         _check_region = _data[i][_region_column];

    //         if (_check_region != _region) continue; //skip unmatching regions
            
    //         // if (_data[i]['Deaths (Per Capita)'] == -1) {
    //         if (_data[i][_affected_column] == -1) {
    //             if (!already_alerted) {
    //                 // alert("Dataset for region:" +_data[i]['Province_State'] + " incomplete at index:" + i)
    //                 alert("Dataset for region:" +_data[i][_region_column] + " incomplete at index:" + i)
    //                 already_alerted = true;
    //             }
    //             // delete this.regions_of_interest[index_of_last_region];
    //             this.regions_of_interest.pop(); //delete
    //             return -1
    //         }

    //         _list_by_region.push(_data[i]);
            
    //         //convert strings from our table that should be numbers to numbers
    //         for (var i_2 = 0, len = _to_number[i_2].length; i_2 < len; i_2++) { 
    //             _list_by_region[counter][_to_number[i_2]] = Number(_list_by_region[counter][_to_number[i_2]])
    //         }
    //         //convert dates to date types
    //         _list_by_region[counter][_to_date] = new Date(_list_by_region[counter][_to_date])
    //         counter ++;
    //     }
    //     inform(_list_by_region)
    //     return index_of_last_region;
    // },

    //un-used
    // get_min_affected: function(_data, column_name) { 
    //     return _data.reduce((min, p) => p.y < min ? p.y : min, _data[0].y);
    // },

    
    get_max_base_affected: function(_dataset_index, column_name) {
        // var new_max = 0;
        result_point = new this.point(0, 0);
        // inform(_dataset_index)
        // inform(column_name)
        inform(this.regions_of_interest);
        inform(_dataset_index);
        for (var i = 0; i < this.regions_of_interest[_dataset_index].data.length; i++) {
            // inform(this.regions_of_interest[_dataset_index][i][column_name])
            if (this.regions_of_interest[_dataset_index].data[i][column_name] > result_point.y){
                // delete result_point;
                result_point.x = i;
                result_point.y = this.regions_of_interest[_dataset_index].data[i][column_name];
            }
        }

        return result_point;
        //return this.regions_of_interest[_dataset_index].reduce((max, p) => p[column_name] > max ? p[column_name] : max, this.regions_of_interest[_dataset_index][column_name]);
    },

    get_max_graph_affected: function(index) {
        
          // var new_max = 0;
          result_point = new this.point(0, 0);
          // inform(column_name)
          for (var i = 0; i < this.graphs[index].graph_data_obj.dataX.length; i++) {
              // inform(this.regions_of_interest[_dataset_index][i][column_name])
              if (this.graphs[index].graph_data_obj.dataY[i] > result_point.y){
                  result_point.x = i;
                  result_point.y = this.graphs[index].graph_data_obj.dataY[i];
              }
          }
  
          return result_point;

    },


    //give methos knowledge of their namespace
    init : function() {
        "use strict";
        this.affected_data_template.parent = this;
        this.header_obj.parent = this;
        this.fill_regions_dropdown.parent = this;
        this.process_data.parent = this;
        this.find_unique_regions.parent = this;
        this.create_region_of_interest.parent = this;
        this.get_context.parent = this;
        this.set_context.parent = this;
        this.get_max_base_affected.parent = this;
        this.get_max_graph_affected.parent = this;
        this.initialize_graph.parent = this;
        this.add_region_to_graph.parent = this;
        this.update_rolling_average.parent = this;
        this.transform_range.parent = this;
        this.add_tidy_endpoints.parent = this;
        this.remove_tidy_endpoints.parent = this;
        this.extract_affected.parent = this;
        this.apply_rolling_average.parent = this; 
        this.point.parent = this;
        this.update_region_label.parent = this;

        delete this.init;
        return this;
    }

}.init()



//Main function, used for creating things like event handlers and loading our "namespace"
$(document).ready(function() {
    "use strict";


    // inform(covid19_confirmed_US_rate);

    //Read page values and assign them to the respective namespace variables
    COVID_SANDBOX_NS.rolling_day_average_enabled = document.getElementById('sevendayavg').checked
    COVID_SANDBOX_NS.rolling_day_value = $('#rolling_days').val();

    //Radio button status get:
    if ($("#region_context_us").is(":checked") == true) { //<- needs tidying up
        COVID_SANDBOX_NS.region_context = "US";
    }
    else {
        COVID_SANDBOX_NS.region_context = "Global";
    }

    if ($("#affected_context_cases").is(":checked") == true) {

        COVID_SANDBOX_NS.affected_context = "Cases";
    }
    else {
        COVID_SANDBOX_NS.affected_context = "Deaths";
    }
    //Jstree:
    // $(function () { $('#jstree').jstree(); });

    //Load Data
    if (GOOGLE_DRIVE_DATA) {
        $.ajax({
            type: "GET",
            url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmW7FaQhyVhJ2Zai8qRGayTdB6BkVpq3pww4ZbBEnc4bjDxYOD58tdnov3GF36R1r8rj9r8g8QYhlW/pub?output=csv",
            dataType: "text",
            success: function(data) {
                // this.affected_data = this.affected_data.sort(sortFunction);
                COVID_SANDBOX_NS.process_data("", $.csv.toObjects(data));
                COVID_SANDBOX_NS.initialize_graph();
                
            }
            });
    }
    else {
        COVID_SANDBOX_NS.process_data("covid19_deaths_US_rate", covid19_deaths_US_rate);
        COVID_SANDBOX_NS.process_data("covid19_confirmed_US_rate", covid19_confirmed_US_rate);
        COVID_SANDBOX_NS.process_data("covid19_deaths_global_rate", covid19_deaths_global_rate);
        COVID_SANDBOX_NS.process_data("covid19_confirmed_global_rate", covid19_confirmed_global_rate);
        COVID_SANDBOX_NS.set_context("US", "Cases");
    
        COVID_SANDBOX_NS.initialize_graph();
    }

    //Event handler for region radio buttons (US/Global)
    $('input[type=radio][name=region_context]').change(function () {
        "use strict";
        // COVID_SANDBOX_NS.region_context = $("#region_context input[type='radio']:checked").val();
        COVID_SANDBOX_NS.region_context = this.value;
        inform(COVID_SANDBOX_NS.region_context + " is now selected.");
        $('#regions_dropdown').empty();
        COVID_SANDBOX_NS.fill_regions_dropdown("None");
        COVID_SANDBOX_NS.fill_regions_dropdown(COVID_SANDBOX_NS.affected_data[COVID_SANDBOX_NS.get_context()].region_list);
    });

        //Event handler for 'affected' radio buttons (cases/deaths)
    $('input[type=radio][name=affected_context]').change(function () {
        "use strict";
        COVID_SANDBOX_NS.affected_context = this.value;
        inform(COVID_SANDBOX_NS.affected_context + " is now selected.");
        $("#regions_dropdown").val('None');
    });


    //Event handler for Region dropdown
    $('#regions_dropdown').change(function () {
        "use strict";
        var highlighted = $( "#regions_dropdown option:selected" ).text();
        inform(highlighted);
        if (highlighted == "None" || highlighted === undefined ) return;
        var try_region = COVID_SANDBOX_NS.create_region_of_interest(highlighted, COVID_SANDBOX_NS.get_context());
        if (try_region != -1) COVID_SANDBOX_NS.add_region_to_graph(try_region);
    });


    //Event handler for Rolling Average Checkbox
    $('#sevendayavg').change(function () {
        "use strict";
        if ($(this).is(':checked')) {
            inform($(this).val() + ' is now checked');
            COVID_SANDBOX_NS.rolling_day_average_enabled = true;
            COVID_SANDBOX_NS.update_rolling_average(true);
        } else {
            inform($(this).val() + ' is now unchecked');
            COVID_SANDBOX_NS.rolling_day_average_enabled = false;
            COVID_SANDBOX_NS.update_rolling_average(true);
        }
    });

    //Pure javascript to synchronize slider and input box
    var custom_slider_range = document.getElementById('rollingavgslider');
    var avg_rolling_input = document.getElementById('rolling_days');
    
    avg_rolling_input.addEventListener('input', function (val) {
      custom_slider_range.value = val.target.value;
    });
    custom_slider_range.addEventListener('input', function (val) {
      avg_rolling_input.value = val.target.value;
    });
     

    //Event handler for Rolling Average Input Box
    $("#rolling_days").keyup(function() {
        "use strict";
       
        check_for_avg_change();
    });

    //Event handler for Rolling Average Slider
    $("#rollingavgslider").change(function() {
        "use strict";
        var val = $('#rollingavgslider').val(); //Get

        check_for_avg_change();
    });



    //Timer for rolling day avg input box check
    function check_for_avg_change() {
        "use strict";

        if( typeof check_for_avg_change.last_val == 'undefined') { //declare what would be our static variable in C
            this.last_val = -1;
            // var last_val2 = -1;
            this.last_bool = -1;
        }

        var val = $('#rolling_days').val(); //Get
        // var val2 = $('#rollingavgslider').val(); //Get
        var checked = $('#sevendayavg').is(':checked');

        if (val == this.last_val && checked == this.last_bool) return; //Nothing has actually changed so return


        if (val < 3) val = 3; //Rolling averages only make sense when they're above 1...
        if (val % 2 == 0) {   //...and odd
            inform("The rolling day average must be odd.");
            val --;
            $('#rolling_days').val(val) //Set
        }

        COVID_SANDBOX_NS.rolling_day_value = val;
        COVID_SANDBOX_NS.update_rolling_average(true);

        this.last_val = val;
        // this.last_val2 = val;
        this.last_bool = checked;
    }
    setInterval(check_for_avg_change, 200);

});




