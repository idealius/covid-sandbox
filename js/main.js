//Global definitions and functions
//--------------------------------------------------------------------------------------------
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

//--------------------------------------------------------------------------------------------

//Our namespace to prevent interferring with other libraries or the window namespace
const COVID_SANDBOX_NS = {

    affected_data:[], //Array of deaths / cases
    region_list:[],  //Unique regions avaiable in our dataset

    first_regions_index:[], //Just some variables for the first region in our data to use for JSXGraph's starting axes, etc.
    
    regions_of_interest:[],//Array of undisturbed data from affected_data based on user interest

    max_date: 0, //Number of days of records
    max_affected: 0, //Highest deaths / cases
    board: NaN,
    rolling_day_average_enabled: true,
    rolling_day_value: NaN,

    //Pre ES6 classes, _obj's are JSXGraph references:
    graph_status_obj: function(_region_obj, _data_obj, _rolling, _color) {
        this.region_obj = _region_obj;
        this.graph_data_obj = _data_obj;
        this.rolling_day_avg = _rolling;
        this.color = _color;
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

    //Main data loading function from Google Drive and applies data to page as well as initalizing graph
    processData: function(google_drive_data) {
        "use strict";

        this.affected_data = $.csv.toObjects(google_drive_data);

        this.affected_data = this.affected_data.sort(sortFunction);
 
        inform(this.affected_data);

        $(".test").append(document.createTextNode(this.affected_data[1]['Province_State']));
    
        this.region_list = this.find_unique_regions(this.affected_data);
        // inform(region_list)
        // inform(region_list[0])

        this.first_regions_index = this.create_region_of_interest(this.region_list[0]);
        // inform(temp)

        this.fill_regions_dropdown(this.region_list);

        // inform(this.get_max_affected(this.first_regions_data,"Deaths (Per Capita)"));
        
        this.initialize_graph();



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
        this.max_affected = this.get_max_affected(0, "Deaths (Per Capita)");
        this.max_affected = this.max_affected + this.max_affected / 5;
        inform(this.max_affected)

        inform(this.regions_of_interest[0][0]["Date"])
        inform(this.regions_of_interest[0][this.regions_of_interest[0].length-1]["Date"])


        //this.max_date = Math.floor((this.regions_of_interest[0][this.regions_of_interest[0].length-1]["Date"] - this.regions_of_interest[0][0]["Date"])/(1000*3600*24));
        this.max_date = this.regions_of_interest[0].length

        // this.board = JXG.JSXGraph.initBoard('jsxgbox', {boundingbox:[-5,5,5,-5], axis:true, showNavigation:true, showCopyright:true});

        JXG.Options.text.display = 'internal'; //needed for text to work on webkit / firefox

        this.board = JXG.JSXGraph.initBoard('jsxgbox', {
            boundingbox: [-50,this.max_affected,this.max_date+20,-.0005],
            //keepaspectratio: true,
            showcopyright: false,
            axis: true,
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
                factorX: 1.25,
                factorY: 1.25,
                wheel: true,
                needshift: false,
                eps: 0.1
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
        var y = this.extract_affected(this.regions_of_interest[0]);

        inform(x.length)
        inform(y)

        this.board.update();
        this.regions_of_interest.pop(); //remove Alabama from our list.
    },

    //Create namespace's regions_of_interest and calls constructor for graph_stats_obj where each graph's information is stored (including JSXGraph's)
    add_region_to_graph: function(_region_of_interest_index) {
        _selected_region = this.regions_of_interest[_region_of_interest_index]
        inform(_selected_region);
        this.max_affected = this.get_max_affected(_region_of_interest_index, "Deaths (Per Capita)");
        var max_affected_graph = this.max_affected + this.max_affected / 5;
        // inform(this.max_affected);

        this.max_date = this.regions_of_interest[_region_of_interest_index].length
        this.board.setBoundingBox([-50,max_affected_graph,this.max_date+20,-.0005]);
        // inform(this.board);

        var x = [...Array(this.max_date).keys()];
        var y = this.extract_affected(_selected_region);

        var my_color = this.custom_colors[_region_of_interest_index % this.custom_colors.length];

        
        // var region_txt = this.board.create('text', [-35,this.max_affected, _selected_region["Province_State"]], {fontSize:18});
        var region_txt = this.board.create('text', [0,0, _selected_region["Province_State"]], {fontSize:18});



        graph = this.board.create('curve', [x,y], {
            strokeColor:my_color,
            fillColor:my_color, 
            fillOpacity:.5, 
            name:"curve", 
            strokeWidth:1.5, 
            fixed: true});
        
        construct = new this.graph_status_obj(region_txt, graph, -1, my_color); // set rolling avg to -1 so its updated later

        this.graphs.push(construct);
        var graph_index = this.graphs.length-1;
        this.add_tidy_endpoints(this.graphs[graph_index].graph_data_obj);



        this.board.update(); //required to update graph coordinates

        if (this.rolling_day_average_enabled)
            this.update_rolling_average();
    
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
            this.graphs[index].graph_data_obj.dataY = this.extract_affected(this.regions_of_interest[index]); //we need to extract data before next line
            this.graphs[index].graph_data_obj.dataY = this.transform_range(this.graphs[index].graph_data_obj.dataY, this.rolling_day_value);
            this.add_tidy_endpoints(this.graphs[index].graph_data_obj);
    },

    //Return affected people (deaths or cases data) 
    extract_affected: function(data) {
        var y = [];
        for (var i = 0; i < data.length; i++) {
            y[i] = data[i]["Deaths (Per Capita)"];
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

                    this.graphs[i].rolling_day_avg = this.rolling_day_value;
                }
            }
        }
        else {
            for (var i = 0; i < this.graphs.length; i++) {
                if (this.graphs[i].rolling_day_avg != this.rolling_day_value || changed) {
                    this.graphs[i].graph_data_obj.dataX = [...Array(this.max_date).keys()];
                    this.graphs[i].graph_data_obj.dataY = this.extract_affected(this.regions_of_interest[i]);
                    this.add_tidy_endpoints(this.graphs[i].graph_data_obj);

                    this.graphs[i].rolling_day_avg = this.rolling_day_value;
                }
            }
        }

        this.board.update();
    },


    //This function is just to make the fillcolor look correct/good
    add_tidy_endpoints: function(graph) {
        inform(graph)
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
        $.each(_data, function(val, text) {
            // inform(val, text)
            dropdown.append($('<option></option>').val(val).html(text));
        });
    },

    //Get a list of unique regions
    find_unique_regions: function(_data) {
        "use strict";
        var _region_list = [];
        var _last_region = "";
        var _check_region = "";
        for (var i = 1; i < _data.length; i++) { //start at one to skip header
            _check_region = _data[i]['Province_State'];
    
            if (_check_region == _last_region) continue; //non-unique region

            _region_list.push(_check_region); //unique region
            _last_region = _check_region;
        }
        return _region_list;         
    },

    
    //Generates the time series for a specific region in parent scope: regions_of_interest then returns the index for it
    create_region_of_interest: function(_region) {
        "use strict";
        this.regions_of_interest.push([]); //append empty array for a new region list to our list of regions_of_interest
        var index_of_last_region = this.regions_of_interest.length-1;
        inform(index_of_last_region)
        var _list_by_region = this.regions_of_interest[index_of_last_region];
        var _to_number = ["Deaths (Per Capita)", "Lat", "Long_", "Population", "Reported Deaths"] //Long is renamed to Long_ by js or csv reader
        var _to_date = "Date"
        var _data = this.affected_data
        var already_alerted = false;

        inform(_list_by_region)
        
        var _check_region = "";
        var counter = 0;
        for (var i = 0; i < _data.length; i++) { //no header
            _check_region = _data[i]['Province_State'];

            if (_check_region != _region) continue; //skip unmatching regions
            
            if (_data[i]['Deaths (Per Capita)'] == -1) {
                if (!already_alerted) {
                    alert("Dataset for region:" +_data[i]['Province_State'] + " incomplete at index:" + i)
                    already_alerted = true;
                }
                // delete this.regions_of_interest[index_of_last_region];
                this.regions_of_interest.pop(); //delete
                return -1
            }

            _list_by_region.push(_data[i]);
            
            //convert strings from our table that should be numbers to numbers
            for (var i_2 = 0, len = _to_number[i_2].length; i_2 < len; i_2++) { 
                _list_by_region[counter][_to_number[i_2]] = Number(_list_by_region[counter][_to_number[i_2]])
            }
            //convert dates to date types
            _list_by_region[counter][_to_date] = new Date(_list_by_region[counter][_to_date])
            counter ++;
        }
        inform(_list_by_region)
        return index_of_last_region;
    },

    //un-used
    // get_min_affected: function(_data, column_name) { 
    //     return _data.reduce((min, p) => p.y < min ? p.y : min, _data[0].y);
    // },
    
    get_max_affected: function(_dataset_index, column_name) {
        var new_max = 0;
        inform(_dataset_index)
        // inform(column_name)
        for (var i = 0; i < this.regions_of_interest[_dataset_index].length; i++) {
            // inform(this.regions_of_interest[_dataset_index][i][column_name])
            if (this.regions_of_interest[_dataset_index][i][column_name] > new_max)
                
                new_max = this.regions_of_interest[_dataset_index][i][column_name];
        }
        return new_max;
        //return this.regions_of_interest[_dataset_index].reduce((max, p) => p[column_name] > max ? p[column_name] : max, this.regions_of_interest[_dataset_index][column_name]);
    },


    //To give methods access to their parent scopes so they know about each other
    init : function() {
        "use strict";
        this.fill_regions_dropdown.parent = this;
        this.processData.parent = this;
        this.find_unique_regions.parent = this;
        this.create_region_of_interest.parent = this;
        // this.get_min_affected.parent = this;
        this.get_max_affected.parent = this;
        this.initialize_graph.parent = this;
        this.add_region_to_graph.parent = this;
        this.update_rolling_average.parent = this;
        this.transform_range.parent = this;
        this.add_tidy_endpoints.parent = this;
        this.remove_tidy_endpoints.parent = this;
        this.extract_affected.parent = this;
        this.apply_rolling_average.parent = this; 

        delete this.init;
        return this;
    }

}.init()



//Main function, used for creating things like event handlers and loading our "namespace"
$(document).ready(function() {
    "use strict";

    //Read page values and assign them to the respective namespace variables
    COVID_SANDBOX_NS.rolling_day_average_enabled = document.getElementById('sevendayavg').checked
    COVID_SANDBOX_NS.rolling_day_value = $('#rolling_days').val();
    //Jstree:
    $(function () { $('#jstree').jstree(); });

    //Load Google Drive Data
    $.ajax({
        type: "GET",
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmW7FaQhyVhJ2Zai8qRGayTdB6BkVpq3pww4ZbBEnc4bjDxYOD58tdnov3GF36R1r8rj9r8g8QYhlW/pub?output=csv",
        dataType: "text",
        success: function(data) {COVID_SANDBOX_NS.processData(data);}
        });

        $( "#myselect option:selected" ).text();

    //Event handler for Region dropdown
    $('#regions_dropdown').change(function () {
        "use strict";
        var highlighted = $( "#regions_dropdown option:selected" ).text();
        inform(highlighted);
        if (highlighted == "None" || highlighted === undefined ) return;
        var try_region = COVID_SANDBOX_NS.create_region_of_interest(highlighted);
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

    //Event handler for Rolling Average Input Box
    $("#rolling_days_input").keyup(function() {
        "use strict";
        // COVID_SANDBOX_NS.rolling_day_value = $('#rolling_days').val();
        // setTimeout(3000);
        // COVID_SANDBOX_NS.update_rolling_average(false);
        check_for_avg_change();
    });


    //Timers

    //Timer for rolling day avg input box check
    function check_for_avg_change() {
        "use strict";

        if( typeof check_for_avg_change.last_val == 'undefined' ) { //declare our what would be our static variable in C
            this.last_val = -1;
            this.last_bool = -1;
        }

        var val = $('#rolling_days').val(); //Get
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
        inform(COVID_SANDBOX_NS.graph_status);

        this.last_val = val;
        this.last_bool = checked;
    }
    setInterval(check_for_avg_change, 3500);

});




