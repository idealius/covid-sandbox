//Global definitions and functions
//--------------------------------------------------------------------------------------------

//Set to true, this should work in Chrome if for instance you have an extension to disable CORS
//*Depecrated, now uses .js files because of CORs
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

    //For holding updating graph regions on window.resize()
    hold_resize: false,

    //Used for rolling avg changes in window
    last_rolling_val: -1,
    last_rolling_bool: -1,

    // region_list:[[]],  //Unique regions avaiable in our dataset, organized by dataset
    regions_of_interest:[],
    browser_context_list:{},

    browser_context: 'desktop',

    max_date: 0, //Number of days of records
    max_affected: 0, //Highest deaths / cases
    board: NaN,
    rolling_day_average_enabled: true,
    rolling_day_value: NaN,

    last_updated_date: 0,

    region_context: "US",
    affected_context: "Cases",

    viewport_width:$(window).width(),
    viewport_height:$(window).height(),

    //Pre ES6 classes, _obj's are JSXGraph references:
    graph_status_obj: function(_region_obj, _data_obj, _arrow_obj,  _rolling, _color, _arrow_peak) {
        this.graph_region_label_obj = _region_obj; //JSXGraph object for region label on graph
        this.graph_data_obj = _data_obj; //JSXGraph object for graph data
        this.graph_arrow_obj = _arrow_obj;
        this.rolling_day_avg = _rolling; //Bool setting for rolling data (enabled/disabled)
        this.color = _color; //Color of JSXGraph region label
        this.arrow_peak = _arrow_peak; //point arrow points to
    },

    graphs: [],

    axis: {x_axis_obj:'', y_axis_obj:''},

 

    // Just some colors
    custom_colors: {
        0:{value:'#3348FF', gamma: 'dark'}, //blue
        1:{value:'#59FF33', gamma: 'bright'},//green
        2:{value:'#9133FF', gamma: 'dark'}, //purple
        3:{value:'#FFB433', gamma: 'dark'},  //brown
        4:{value:'#33FFF4', gamma: 'bright'},//cyan
        5:{value:'#E433FF', gamma: 'dark'}  //magenta
    },

    //Object for constructing the column name strings for the different datasets.
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
            case 'spanish_flu_conversion':
                this.affected_column = "Deaths (Per Capita)";
                this.region_context = 'country';
                this.region_column = 'Country/Region';
                break;
            default: //unused
                this.region_context = 'US';
                this.region_column = 'Country/Region';
                this.affected_column = "Cases (Per Capita)";
                break;
        }
        this.date_column = "Date"
    },

   //Object class for different datasets
   browser_context_template: function(_context, _graph_region_font_size, _graph_region_outline, _axis_font_size, ) {
    // var data2 = _data; //this is a required buffer between data & _data
    // var columns2 = new this.header_obj(_filename);
    var obj = {
        [_context]:{graph_region_font_size: _graph_region_font_size,
                    graph_region_outline: _graph_region_outline,
                    axis_font_size: _axis_font_size,
        }
    }

    return obj;
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

    push_region_obj: function(_parent_array, _filename, _data, _region) {
        var data2 = _data; //this is a required buffer between data & _data <- confirmed
        var columns2 = new this.header_obj(_filename);
        // var context2 = new interpret_context(_filename);
        var context2 = _filename;
        var region2 = _region;
        var obj = {data:data2, columns:columns2, region:region2, context:context2};
        _parent_array.push({});
        Object.assign(_parent_array[_parent_array.length-1], obj);
        return;
        // return this.regions_of_interest.length-1; //return our index
    },


    //Just to make accessing data columns shorter / better named:
    us_death_rate : "covid19_deaths_US_rate",
    us_case_rate : "covid19_confirmed_US_rate",
    global_death_rate : "covid19_deaths_global_rate",
    global_case_rate : "covid19_confirmed_global_rate",
    uk_spanish_flu_deaths: "spanish_flu_conversion",

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

    //Might not need this.
    interpret_context: function(_context){
        _return = {region:'',affected:''}
        switch (_context) {
            case this.us_case_rate:
                _return.region = 'US';
                _return.affected = 'Cases';
                break;
            case this.us_death_rate:
                _return.region = 'US';
                _return.affected = 'Deaths';
                break;
            case this.global_case_rate:
                _return.region = 'Global';
                _return.affected = 'Cases';
                break;
            case this.global_death_rate:
            case this.uk_spanish_flu_deaths:
                _return.region = 'Global';
                _return.affected = 'Deaths';
                break;
            default:
            break;
        }
        return _return;
    },

    set_context: function(_region, _affected) {
        if (_region.toUpperCase() == "US") { //.toUpperCase just to avoid any case mistakes
            _region = "US"; 
            $("#region_context_us").prop('checked', true);
            $("#region_context_global").prop('checked', false);
        }
        else {
            _region = "Global"
            $("#region_context_global").prop('checked', true);
            $("#region_context_us").prop('checked', false);
        }


        if (_affected.toUpperCase() == "CASES") {
            _affected = "Cases";
            $("#affected_context_cases").prop('checked', true);
            $("#affected_context_deaths").prop('checked', false);
        }
        else {
            _affected = "Deaths";
            $("#affected_context_deaths").prop('checked', true);
            $("#affected_context_cases").prop('checked', false);
        }

        this.region_context = _region;
        this.affected_context = _affected;
    },

    affected_data:{}, //Array of deaths / cases
    //affected_data[filename] where i is the filename/dataset
    //->              [filename].data[index][column_name] //actual numerical records
    //->              [filename].columns.affected_column //deaths or cases column name
    //->              [filename].columns.region_context //US or world
    //->              [filename].columns.region_column //State / Country column names
    //->              [filename].columns.date          //date column name
    //->              [filename].region_list          //list of unique sub-regions
    

    //Main data loading function from JS/Google Drive and applies data to page as well as initalizing graph
    process_data: function(_filename, _data) {
        "use strict";


        var new_dataset = this.affected_data_template(_filename, _data);
        inform(_filename);

        
        Object.assign(this.affected_data, new_dataset);
        this.remove_invalid_regions(_filename);
  
        var _to_number = [this.affected_data[_filename].columns.affected_column]; //make an array in case we have multiple number values
        var _to_date = "Date";
        // This next line shows why we use temp variables to shorten code later on:
        for (var i = 0; i < this.affected_data[_filename].data[this.affected_data[_filename].data.length-1][this.affected_data[_filename].columns.affected_column].length; i++) {
            //convert strings from our table that should be numbers to numbers
            for (var i_2 = 0, len = _to_number[i_2].length; i_2 < len; i_2++) { 
                this.affected_data[_filename].data[i][_to_number[i_2]] = Number(this.affected_data[_filename].data[i][_to_number[i_2]])
            }
            //convert dates to date types
            // data_buffer[counter][_to_date] = new Date(data_buffer[counter][_to_date]);
            this.affected_data[_filename].data[i][_to_date] = new Date(this.affected_data[_filename].data[i][_to_date]);
        }

        this.affected_data[_filename].region_list = this.find_unique_regions(this.affected_data[_filename].data, this.affected_data[_filename].columns.region_column);

        inform(this.affected_data);
    
    },

    sort_function: function(_a, _b, _column_name) {
        if (_a[_column_name] === _b[_column_name]) {
            return 0;
        }
        else {
            return (_a[_column_name] < _b[_column_name]) ? -1 : 1;
        }
    },

    //Removes regions with affected (per capita) values == -1
    remove_invalid_regions: function(_filename) {
        _data = this.affected_data[_filename];

        var current_region = ""
        for (var i=0; i<_data.data.length;i++) {
            if (_data.data[i][_data.columns.affected_column] == -1) {
                current_region = _data.data[i][_data.columns.region_column];
                
                while (current_region ==  _data.data[i][_data.columns.region_column]) {
                    _data.data.splice(i,1);
                    // no i++ because, somewhat confusingly, splice re-indexes the array as it goes, so the i doesn't need to increment
                }
                i=0; //Guam has one extra row so just start over each time
            }
        }

        return _data;
    },

    


    //Create a blank graph with dimensions defined by the first region's data (Alabama)
    initialize_graph: function() {

        // this.regions_of_interest.pop();
        var context = this.get_context();

        var _parent_data = this.affected_data[context];
        this.fill_regions_dropdown(_parent_data.region_list);

        var _region_column = _parent_data.columns.region_column;
        var _data = this.affected_data[context].data;
        var temp_region = [];
        // this.push_region_obj(temp_region, context, _data[0].data, _data[0][_region_column]);
        this.create_region_of_interest(temp_region, _data[0][_region_column], context);

        var _affected_column = _parent_data.columns.affected_column;
        this.max_affected = this.get_max_base_affected(temp_region[0], _affected_column);
        this.max_affected.y = this.max_affected.y + this.max_affected.y / 8;



   

        //this.max_date = Math.floor((this.regions_of_interest[0][this.regions_of_interest[0].length-1]["Date"] - this.regions_of_interest[0][0]["Date"])/(1000*3600*24));
        this.max_date = temp_region[0].data.length;

        // this.board = JXG.JSXGraph.initBoard('jsxgbox', {boundingbox:[-5,5,5,-5], axis:true, showNavigation:true, showCopyright:true});

  
        JXG.Options.text.cssDefaultStyle = '';
        JXG.Options.text.highlightCssDefaultStyle = '';


        var new_browser_context = this.browser_context_template("desktop", 18, false, 14);
        Object.assign(this.browser_context_list, new_browser_context);

        new_browser_context = this.browser_context_template("mobile", 11, true, 10);
        Object.assign(this.browser_context_list, new_browser_context);


        // this.viewport_width = $(window).width();
        // this.viewport_height = $(window).height();

        if (this.viewport_width < 768) this.browser_context = 'mobile';
        else this.browser_context = 'desktop';

        this.board = JXG.JSXGraph.initBoard('jsxbox', {
            boundingbox: [-50,this.max_affected.y,this.max_date+20,-.0005],
            // boundingbox: [0,10,10,0],
            //keepaspectratio: true,
            showcopyright: false,
            axis: true,
            renderer: 'canvas',
            defaultAxes: {
                x: {
                    strokeColor: 'grey',
                    ticks: {
                        visible: 'inherit',
                        fontsize: 5,
                        label: {
                            fontsize:this.browser_context_list[this.browser_context].axis_font_size
                        }
                    },
                    
                    // withLabel: true
                },
                y: {
                    strokeColor: 'grey',
                    ticks: {
                        visible: 'inherit',
                        fontsize: 5,
                        label: {
                            fontsize:this.browser_context_list[this.browser_context].axis_font_size
                        }
                    }
                    
                    // withLabel: true
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
                needTwoFingers: false,
                needShift: false
            },
    
            showZoom: false,
            showNavigation: false
        });

        inform(this.board);

        var x = [...Array(this.max_date).keys()];
        var y = this.extract_affected(temp_region[0].data, temp_region[0].columns.affected_column);


        this.add_axes();

        this.board.update();

        // this.board.on('update', this.update_axes());
        this.board.on('update', function (){ COVID_SANDBOX_NS.update_axes();});

        // this.regions_of_interest.pop(); //remove Alabama from our list.
        delete temp_region;
    },

    //Updates axes and arrows
    update_axes: function() {
        this.board.update();

        //AXES:
        var bounding_box = this.board.getBoundingBox(); //returns 4 element array: left, upper, right, lower

        if (bounding_box[2] > Math.abs(bounding_box[0])) var x_offset = (bounding_box[2] / 2 );
        else var x_offset = bounding_box[0] /2
        var y_offset = -(bounding_box[1] -bounding_box[3]) / 7;

        this.axis.x_axis_obj.setPosition(JXG.COORDS_BY_USER, [x_offset,y_offset]);


        x_offset = (bounding_box[2] - bounding_box[0]) / 80;
        if (bounding_box[1] > Math.abs(bounding_box[3])) y_offset = (bounding_box[1] / 10 );
        else {
            y_offset = bounding_box[3]
        }
    
        this.axis.y_axis_obj.setPosition(JXG.COORDS_BY_USER, [x_offset,y_offset]);

      
        this.board.fullUpdate();


    },


    add_axes: function() {

        //rather than duplicate the x and y position calculations, just set them to zero and call update_axes():

        this.axis.x_axis_obj = this.board.create('text', [
            //X,Y value:
            0, 0,
            'Days since 1/22/20'
            ], {
            display: 'internal',
            anchorX: "middle",
            anchorY: "bottom", // <- should be top, but jsgx does opposite of what I expect.
            cssClass: "region_labels_bright", 
            highlightCssClass: "region_labels_bright_highlight",
            fontSize: this.browser_context_list[this.browser_context].axis_font_size,
            strokeColor: 'black',
            highlight: false,
            needsRegularUpdate:true,
            // rotate: 90,
            fixed: true // works
        });


        this.axis.y_axis_obj = this.board.create('text', [
            //X,Y value:
            0, 0,
            'Rate Change as % of Region Population'
            ], {
            display: 'internal',
            anchorX: "left",
            anchorY: "top", // <- should be top, but jsgx does opposite of what I expect.
            cssClass: "region_labels_bright", 
            highlightCssClass: "region_labels_bright_highlight",
            fontSize:this.browser_context_list[this.browser_context].axis_font_size,
            strokeColor: 'black',
            highlight: false,
            rotate: 90,
            needsRegularUpdate:true,
            fixed: true // works
        });


        this.update_axes();
    },

    // graph_status_obj: function(_region_obj, _data_obj, _rolling, _color) {
    //     this.region_obj = _region_obj; //JSXGraph for region label on graph
    //     this.graph_data_obj = _data_obj; //JSXGraph for graph data
    //     this.rolling_day_avg = _rolling; //Bool setting for rolling data (enabled/disabled)
    //     this.color = _color; //Color of JSXGraph region label
    // },




    clear_all: function(_reset_bounds) {
        if (_reset_bounds) {
            this.max_affected.x = 0;
            this.max_affected.y = 0;
        }

        for (var i = 0; i < this.graphs.length; i++) {
            this.board.removeObject(this.graphs[i].graph_arrow_obj);
            this.board.removeObject(this.graphs[i].graph_region_label_obj);
            this.board.removeObject(this.graphs[i].graph_data_obj);
            delete this.graphs[i];
            delete this.regions_of_interest[i];
        }
        this.graphs = [];
        this.regions_of_interest = [];
        this.board.update();

    },

    duplicate_graph_check: function(_selected_region_parent_data, _index) {
        var src = _selected_region_parent_data[_index].region;

        for (var i = 0; i < this.graphs.length; i++) {
            if (this.graphs[i].graph_region_label_obj.plaintext.search(src) != -1) return true;
        }
        return false;
    },

    //Create namespace's regions_of_interest and calls constructor for COVID_SANDBOX.NS.graphs where each graph's information is stored (including JSXGraph's)
    add_region_to_graph: function(_selected_region_parent_data, _index) {
  
        if (_index == -1) _index = _selected_region_parent_data.length-1;
        var _selected_region = _selected_region_parent_data[_index];
        
        if (this.duplicate_graph_check(_selected_region_parent_data, _index)) return -1;

        //Used for keeping track of the highest value for bounding box settings
        var header_factor = 8; // when set to 5 adds 20% to the top.
        new_max_affected = this.get_max_base_affected(_selected_region, _selected_region.columns.affected_column);
        peak = new_max_affected.y;
        run = new_max_affected.x;
        new_max_affected.y = new_max_affected.y + new_max_affected.y / header_factor
        // var data_context = this.regions_of_interest[__selected_region]._region_obj
        if (new_max_affected.y > this.max_affected.y) this.max_affected.y = new_max_affected.y;
        if (new_max_affected.x > this.max_affected.x) this.max_affected.x = new_max_affected.x
    

        //numeric date
        this.max_date = _selected_region.data.length;
        //Set a much too large bounding box to avoid label instantiation off the board (which results in cropped size relevant to dragging):
        this.board.setBoundingBox([-20,this.max_affected.y * 2,this.max_date * 2+20,-this.max_affected.y / 3]);
        this.board.update();

        var x = [...Array(this.max_date).keys()];
        var y = this.extract_affected(_selected_region.data, _selected_region.columns.affected_column);

        var my_color_index = _index % Object.keys(this.custom_colors).length;

        var my_color = this.custom_colors[my_color_index].value;

       

        var graph = this.board.create('curve', [x,y], {
            strokeColor:my_color,
            fillColor:my_color, 
            fillOpacity:.5, 
            name:"curve", 
            strokeWidth:1.5,
            fixed: true,
            highlight: false
            // withlabel: true
            // dragToTopOfLayer: true
        });

        // ****************Region Label Object*******************

        // JXG.Options.text.cssDefaultStyle = '';
        // JXG.Options.text.highlightCssDefaultStyle = '';
        
        var region_labels_style;

        if (!this.browser_context_list[this.browser_context].graph_region_outline) {
            if (this.custom_colors[my_color_index].gamma == 'dark') region_labels_style ="region_labels_dark"; //_dark for original config
            else region_labels_style = "region_labels_bright";    
        } 
        else {
            if (this.custom_colors[my_color_index].gamma == 'dark') region_labels_style ="region_labels_dark"; //_dark for original config
            else region_labels_style = "region_labels_bright_mobile";    
        }

        //Interpret_context gives us "Cases" or "Deaths" without the "Per Capita" part:
        var label_context = this.interpret_context(_selected_region_parent_data[_index].context);
        // inform(this.interpret_context(_selected_region_parent_data[_index].context));
        // inform(_selected_region);
        // var region_txt = _selected_region.data[0][_selected_region.columns.region_column] + " (" + label_context.affected + ")";
        var region_txt = _selected_region.region + " (" + label_context.affected + ")";

        inform(region_txt);

        var _font_size = this.browser_context_list[this.browser_context].graph_region_font_size;

        var label = { x: run, 
                      y: peak + peak / 8
                    };

        var region_txt_obj = this.board.create('text', [
            //X,Y value:
            label.x, label.y, //careful not to go too far right or jsxgraph crops text object's box size for dragging
            // this.max_affected.x / 2, peak / 2,
            region_txt
            ], {
            anchorX: "middle",
            anchorY: "bottom", // jsxg does opposite of what I expect, top is intended.
            cssClass: region_labels_style, 
            highlightCssClass: region_labels_style + "_highlight",
            // strokeColor: 'red',
            // isLabel: true,
            fontSize: _font_size,
            strokeColor: my_color,
            // highlight: false,
            // rotate: 90,// only works if display is set to internal
            // highlightStrokeColor: my_color,
            // dragToTopOfLayer: true,

            fixed: false // works
        });
        // region_txt_obj.setText(region_txt + '     '); //this actually works to update text
        // this.board.fullUpdate();
        // region_txt_obj.setPosition(JXG.COORDS_BY_USER, [label.x-this.,label.y]);

        inform(region_txt_obj);

        // ****************Arrow/Line Label Object*******************
        var arrow_peak = [run-1,peak];
        
        var arrow_obj = this.board.create('line', 
            //point coords
            // [region_txt_obj, [arrow_peak[0], arrow_peak[1]]], {
            [[label.x, label.y], [arrow_peak[0], arrow_peak[1]]], {
            straightFirst:false, straightLast:false,
            strokeWidth:2, dash:1,
            fixed: true,
            strokeColor: my_color
            });


        region_txt_obj.on('move', function(){
            // var point = this.coords.usrCoords;
            // var bounding_box = COVID_SANDBOX_NS.board.getBoundingBox();
            // var vert_scale = bounding_box[1] - bounding_box[3];
            // point[2] = point[2] + (COVID_SANDBOX_NS.browser_context_list[COVID_SANDBOX_NS.browser_context].graph_region_font_size  * (this.content.split(" ").length - 1))/ vert_scale;
            // arrow_obj.point1.setPosition(JXG.COORDS_BY_USER, point);
            arrow_obj.point1.setPosition(JXG.COORDS_BY_USER, this.coords.usrCoords);
            // console.log(this);
        });
     

        // board.on('update', function(){console.log('updated', point.X(), point.Y())});

        construct = new this.graph_status_obj(region_txt_obj, graph, arrow_obj, -1, my_color); // set rolling avg to -1 so its updated later at update_rolling_average()
 

        var graph_index = this.graphs.length; //since we check it before the push() it will equal current .length
        this.graphs.push(construct);
        
        this.add_tidy_endpoints(this.graphs[graph_index].graph_data_obj);


        if (this.rolling_day_average_enabled)
            this.update_rolling_average(_selected_region_parent_data);
        else 
            this.update(); //required to update graph's new curve


        
    },

    arrange_region_labels: function() {
        _graph_max_affected = [];

        var _box = this.board.getBoundingBox(); //returns 4 element array: left, upper, right, lower
        var _vert_space = _box[1];

        //Get values
        for (var i = 0; i < this.graphs.length; i++) {
            _graph_max_affected.push(this.get_max_graph_affected(i));
            _graph_max_affected[i].index = i;
            // inform(_graph_max_affected);
        }
        
        //Sort
        _graph_max_affected.sort(function(a, b) {return b.y - a.y;}); //sort by descending
 
        //Arrange
        var row_size = 8; // number of labels in each column
        _vert_space = _vert_space - _vert_space / row_size; // just to lower it a bit
        var column_size = 200; //space between columns
        var min = _vert_space / (row_size + 3); //buffer between x axis and labels
        for (var i = 0; i < this.graphs.length; i++) {
            var i2 = i+1;
            // if (_graph_max_affected[i].x < this.max_date / 2) {
            //     x = this.max_date / 2;
            // }
            // else
            x = this.max_date + 150;
            y = _vert_space  - (_vert_space / row_size * i2) + min;
            while (y < min) { // move over to another column.
                y = y + _vert_space;
                // if (y < _vert_space) 
                x += column_size;
            }
            // inform(y);
            var _index = _graph_max_affected[i].index;
            var _region_label_obj = this.graphs[_index].graph_region_label_obj;
            var find_result = _region_label_obj.plaintext.lastIndexOf('.');
            if (find_result != -1) {
                _region_label_obj.plaintext = _region_label_obj.plaintext.slice(find_result+1, _region_label_obj.plaintext.length);
            }
            _region_label_obj.setText(i2 + '. ' + _region_label_obj.plaintext); //this actually works to update text
            _region_label_obj.setPosition(JXG.COORDS_BY_USER, [x,y]); //update text label position
            this.graphs[_index].graph_arrow_obj.point1.setPosition(JXG.COORDS_BY_USER, _region_label_obj.coords.usrCoords); //update arrow position
        }
        this.board.update();
    },
    
    //Clip by active graph data potentially put through rolling average / other transformations versus underlying actual data.
    clip_bounding_box_by_graph: function() {
        var _max_y = 0;
        for (var i = 0; i <this.graphs.length; i++) {
            for (var i2 = 0; i2 < this.graphs[i].graph_data_obj.dataY.length; i2++) {
                if (this.graphs[i].graph_data_obj.dataY[i2] > _max_y) {
                    _max_y = this.graphs[i].graph_data_obj.dataY[i2];
                    var last_obj = this.graphs[i].graph_data_obj;
                }
            }
        }

        this.board.setBoundingBox([-20,_max_y + _max_y / 8, this.max_date+20,-_max_y / 3]);
    },

    add_top_regions: function(_num_regions, _num_days){
        var _context = this.get_context();
        var _region_list = [];
        var _prev_region = "";
        var _check_region = "";
        var _affected_column = this.affected_data[_context].columns.affected_column;
        var _region_name_column = this.affected_data[_context].columns.region_column;
        var _data = this.affected_data[_context].data;
        var _total = 0;
        var counter = 0;


        if (this.max_date < 1) this.max_date = 1;

        if (_num_days > this.max_date) _num_days = this.max_date;
        else if (_num_days < 1) _num_days = 1;
        if (_num_regions > this.affected_data[_context].region_list.length) _num_regions = this.affected_data[_context].region_list.length;
        else if (_num_regions < 1) _num_regions = 1;

        var start = this.max_date - _num_days;


        for (var i = 0; i < _data.length; i++) {
 
            _check_region = _data[i][_region_name_column];
            //Skip records until we hit start
            if (counter < start) {
                _prev_region = _check_region;
                counter ++;
                continue;
            }
            //Sum region totals:
            if (_check_region == _prev_region) {
                _total += _data[i][_affected_column];
            }
            else {
                if (i == 0) { //Just in case this has a header Doesn't appear to be needed 11/23/20
                    counter ++;
                    _prev_region = _check_region;
                    continue;
                }

                _region_list.push({ region:_data[i-1][_region_name_column],
                                    total:_total
                                });
                _total = 0;
                counter = 0;
            }
            counter ++;
            _prev_region = _check_region;
        }
        
        //Last region in list (e.g. Wyoming) (confirmed 11/23/2020)
        _region_list.push({ region: _data[_data.length-1][_region_name_column],
                            total: _total
                        });

        _region_list.sort(function(a, b) {return b.total - a.total;}); //sort by descending total
        var _full_list = _region_list;
        _region_list = _region_list.slice(0, _num_regions);

        
        for (var i = 0; i < _region_list.length; i++) {
            var try_region = this.create_region_of_interest(this.regions_of_interest, _region_list[i].region, _context);
            if (try_region != -1) this.add_region_to_graph(this.regions_of_interest, -1);
            else alert("error adding region: " + _region_list[i].region);
        }

        this.arrange_region_labels();
        
        //Log full list to textarea
        var context_str = new this.header_obj(_context);
        // inform(_full_list, _region_list);
        var str = "List of region totals sorted by (" + context_str.affected_column + ") across last " + _num_days + " days:\n\n";

        for (var i = 0; i < _full_list.length; i++) {
            str = str + (i + 1) + '. ' + _full_list[i].region + ' ' + Number.parseFloat(_full_list[i].total).toPrecision(5) + '%\n';
        }

        var divider_str = "\n*****************************\n\n*****************************\n";
        $('#console').val(str + divider_str + $('#console').val());

        return _region_list;
    },

    set_text_objects_ontop: function(){ //need to add to init !
        
        for (var i = 0; i < x; i++) {
            this.graphs.graph_region_label_obj.layer
        }
    },

    
    update_region_label: function(index) {
        var _selected_graph_region = this.graphs[index];
        var max_affected = this.get_max_graph_affected(index);
        _selected_graph_region.graph_region_label_obj.setCoords(max_affected.x,max_affected.y);
        
    },

    update_arrow_peak: function(index) {
        var _selected_graph_region = this.graphs[index];
        var max_affected = this.get_max_graph_affected(index);
        // Unsure why we need to subract 1 for max_affected.x !!                                    v
        _selected_graph_region.graph_arrow_obj.point2.setPosition(JXG.COORDS_BY_USER, [max_affected.x-1, max_affected.y]);
        
    },

    //Actual algorithm that applies the rolling average to data
    transform_range: function(data, breadth) {
        var range = [];
        var parent_result_array = []

        //Inline function to account for rangle limitations at beginning and end of array
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
            parent_result_array.push(range);
        }
        return parent_result_array;
    },

    //Helper function for particular graph data resetting to regions_of_interest and calls transform_range to apply rolling average
    apply_rolling_average: function(_data, index) {
            this.remove_tidy_endpoints(this.graphs[index].graph_data_obj)
            this.graphs[index].graph_data_obj.dataX = [...Array(_data.data.length).keys()];
            this.graphs[index].graph_data_obj.dataY = this.extract_affected(_data.data, _data.columns.affected_column); //we need to extract data before next line
            this.graphs[index].graph_data_obj.dataY = this.transform_range(this.graphs[index].graph_data_obj.dataY, this.rolling_day_value);
            this.add_tidy_endpoints(this.graphs[index].graph_data_obj);
    },

    //Return affected people (deaths or cases data) 
    extract_affected: function(data, column) {
        var y = [];

        for (var i = 0; i < data.length; i++) {
            y.push(data[i][column]);
        }
        return y;
    },

    //Globally updates rolling average changes after a change
    update_rolling_average: function(_data, changed) {
        
        if (this.rolling_day_average_enabled) {
            for (var i = 0; i < this.graphs.length; i++) {
                if (this.graphs[i].rolling_day_avg != this.rolling_day_value || changed) {
                    this.apply_rolling_average(_data[i], i);
                    this.graphs[i].rolling_day_avg = this.rolling_day_value;
                    // this.update_region_label(i);
                    this.update_arrow_peak(i);
                }
            }
        }
        else {
            for (var i = 0; i < this.graphs.length; i++) {
                if (this.graphs[i].rolling_day_avg != this.rolling_day_value || changed) {

                    this.graphs[i].graph_data_obj.dataX = [...Array(this.max_date).keys()];
                    this.graphs[i].graph_data_obj.dataY = this.extract_affected(this.regions_of_interest[i].data, this.regions_of_interest[i].columns.affected_column);
                    this.add_tidy_endpoints(this.graphs[i].graph_data_obj);
                    this.graphs[i].rolling_day_avg = this.rolling_day_value;
                    this.update_arrow_peak(i);
                    // this.update_region_label(i);

                }
            }
        }


        this.update();
    },

    //Wrapper for board update so we can adjust axes
    update: function() {
        this.update_axes();
        this.board.update();
    },

    //This function is just to make the fillcolor look correct/good
    add_tidy_endpoints: function(graph) {
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
                dropdown.append($('<option></option>').val(val).html(text));
            });
        }
        else  dropdown.append($('<option></option>').val(_data).html(_data));
    },

    //Get a list of unique regions
    find_unique_regions: function(_region, _column_name) {
            //Data structure of     affected_data:[]
        "use strict";
        var _data = _region;
        var _region_list = [];
        var _last_region = "";
        var _check_region = "";
        for (var i = 1; i < _data.length; i++) { //start at one to skip header
            _check_region = _data[i][_column_name];

            if (_check_region == _last_region) continue; //non-unique region
            _region_list.push(_check_region); //unique region
            _last_region = _check_region;
        }
        return _region_list;         
    },

    
   //Generates the time series for a specific region in parent scope: regions_of_interest then returns the index for it
   create_region_of_interest: function(_parent_array, _region, context) {
    "use strict";

    // var context = this.get_context();
    var _parent_data = this.affected_data[context];
    // this.fill_regions_dropdown(_parent_data.region_list);
    var _region_column = _parent_data.columns.region_column;
    var _affected_column = _parent_data.columns.affected_column;
    var _data = this.affected_data[context].data;
    
    var data_buffer = [];
    // this.create_region_of_interest(_data[0][_region_column]);

    // var _region_data = this.affected_data_template(context, _data);



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
            return -1
        }
        
        data_buffer.push(_data[i]);
        
        // //convert strings from our table that should be numbers to numbers
        // for (var i_2 = 0, len = _to_number[i_2].length; i_2 < len; i_2++) { 
        //     data_buffer[counter][_to_number[i_2]] = Number(data_buffer[counter][_to_number[i_2]])
        // }
        // //convert dates to date types
        // data_buffer[counter][_to_date] = new Date(data_buffer[counter][_to_date]);
        // counter ++;
    }

    this.push_region_obj(_parent_array, context, data_buffer, _region);

    return;
   },
   
    
    get_max_base_affected: function(_dataset, column_name) {

        result_point = new this.point(0, 0);

        _data = _dataset;

        for (var i = 0; i < _data.data.length; i++) {

            if (_data.data[i][column_name] > result_point.y){
                result_point.x = i;
                result_point.y = _data.data[i][column_name];
            }
        }

        return result_point;
        //return this.regions_of_interest[_dataset_index].reduce((max, p) => p[column_name] > max ? p[column_name] : max, this.regions_of_interest[_dataset_index][column_name]);
    },

    get_max_graph_affected: function(index) {
          result_point = new this.point(0, 0);

          for (var i = 0; i < this.graphs[index].graph_data_obj.dataX.length; i++) {
              if (this.graphs[index].graph_data_obj.dataY[i] > result_point.y){
                  result_point.x = i;
                  result_point.y = this.graphs[index].graph_data_obj.dataY[i];
              }
          }
  
          return result_point;

    },


    //give methods knowledge of their namespace
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
        this.remove_invalid_regions.parent = this;
        this.add_axes.parent = this;
        this.update.parent = this;
        this.update_axes.parent = this;
        this.interpret_context.parent = this;
        this.browser_context_template.parent = this;
        this.sort_function.parent = this;
        this.add_top_regions.parent = this;
        this.clear_all.parent = this;
        this.clip_bounding_box_by_graph.parent = this;
        this.push_region_obj.parent = this;
        this.update_arrow_peak.parent = this;
        this.arrange_region_labels.parent = this;
        this.duplicate_graph_check.parent = this;

        delete this.init;
        return this;
    }

}.init()



//Main function, used for creating things like event handlers and loading our "namespace"
$(document).ready(function() {
    "use strict";

    // Used for things like window.resize
    var _date_timer = new Date();
    var waitForFinalEvent = (function () {
        var timers = {};
        return function (callback, ms, uniqueId) {
            if (!uniqueId) {
            uniqueId = "Don't call this twice without a uniqueId";
            }
            if (timers[uniqueId]) {
            clearTimeout (timers[uniqueId]);
            }
            timers[uniqueId] = setTimeout(callback, ms);
    };
    })();

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
        COVID_SANDBOX_NS.process_data("spanish_flu_conversion", spanish_flu_conversion);

        COVID_SANDBOX_NS.set_context("US", "Cases");
        COVID_SANDBOX_NS.initialize_graph();
        inform(COVID_SANDBOX_NS.affected_data["covid19_deaths_US_rate"]);
        var _context = "covid19_deaths_US_rate"
        var _parent_data = COVID_SANDBOX_NS.affected_data[_context];
        COVID_SANDBOX_NS.last_updated_date = _parent_data.data[_parent_data.data.length-1][_parent_data.columns.date_column];
        inform(COVID_SANDBOX_NS.last_updated_date);
        // $('#last_updated').after(COVID_SANDBOX_NS.last_updated_date)
        $('#last_updated').append(COVID_SANDBOX_NS.last_updated_date);
    }

    //Event handler for region radio buttons (US/Global)
    $('input[type=radio][name=region_context]').change(function () {
        "use strict";
        // COVID_SANDBOX_NS.region_context = $("#region_context input[type='radio']:checked").val();
        COVID_SANDBOX_NS.region_context = this.value;
        inform(COVID_SANDBOX_NS.region_context + " is now selected.");
        $('#regions_dropdown').empty();
        COVID_SANDBOX_NS.fill_regions_dropdown("-- Select --");
        COVID_SANDBOX_NS.fill_regions_dropdown(COVID_SANDBOX_NS.affected_data[COVID_SANDBOX_NS.get_context()].region_list);
    });

    //Event handler for 'affected' radio buttons (cases/deaths)
    $('input[type=radio][name=affected_context]').change(function () {
        "use strict";
        COVID_SANDBOX_NS.affected_context = this.value;
        inform(COVID_SANDBOX_NS.affected_context + " is now selected.");
        $("#regions_dropdown").val("-- Select --");
    });


    //Event handler for Region dropdown
    $('#regions_dropdown').change(function () {
        "use strict";
        var highlighted = $( "#regions_dropdown option:selected" ).text();
        inform(highlighted);
        if (highlighted == "-- Select --" || highlighted === undefined ) return;
        var try_region = COVID_SANDBOX_NS.create_region_of_interest(COVID_SANDBOX_NS.regions_of_interest, highlighted, COVID_SANDBOX_NS.get_context());
        if (try_region != -1) {
            inform(COVID_SANDBOX_NS.regions_of_interest);
            COVID_SANDBOX_NS.add_region_to_graph(COVID_SANDBOX_NS.regions_of_interest, -1);
        }
    });


    //Event handler for Rolling Average Checkbox
    $('#sevendayavg').change(function () {
        "use strict";
        if ($(this).is(':checked')) {
            inform($(this).val() + ' is now checked');
            COVID_SANDBOX_NS.rolling_day_average_enabled = true;
            COVID_SANDBOX_NS.update_rolling_average(COVID_SANDBOX_NS.regions_of_interest, true);
        } else {
            inform($(this).val() + ' is now unchecked');
            COVID_SANDBOX_NS.rolling_day_average_enabled = false;
            COVID_SANDBOX_NS.update_rolling_average(COVID_SANDBOX_NS.regions_of_interest, true);
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

    //Event handler for UK Spanish Flu button
    $('#uk_spanish_flu_button').click(function() {
        "use strict";
        var prior_context = {region: COVID_SANDBOX_NS.region_context, affected: COVID_SANDBOX_NS.affected_context}
        //= COVID_SANDBOX_NS.interpret_context(COVID_SANDBOX_NS.get_context());
        inform (prior_context);
        COVID_SANDBOX_NS.set_context("Global", "Deaths");
        var try_region = COVID_SANDBOX_NS.create_region_of_interest(COVID_SANDBOX_NS.regions_of_interest, "United Kingdom Spanish Flu 1918", COVID_SANDBOX_NS.uk_spanish_flu_deaths);
        if (try_region != -1) {
            COVID_SANDBOX_NS.add_region_to_graph(COVID_SANDBOX_NS.regions_of_interest, -1);
        }
        COVID_SANDBOX_NS.set_context(prior_context.region, prior_context.affected);
        // Update regions dropdown:
        $('#regions_dropdown').empty();
        COVID_SANDBOX_NS.fill_regions_dropdown("-- Select --");
        COVID_SANDBOX_NS.fill_regions_dropdown(COVID_SANDBOX_NS.affected_data[COVID_SANDBOX_NS.get_context()].region_list);
    });

    //Event handler for top regions add button
    $('#top_regions_button').click(function() {
        "use strict";
        COVID_SANDBOX_NS.add_top_regions($('#top_regions').val(), $('#top_regions_days').val());
    });

    //Event handler for clear button
    $('#clear_button').click(function() {
        "use strict";
        COVID_SANDBOX_NS.clear_all(true);

        $('#regions_dropdown').empty();
        COVID_SANDBOX_NS.fill_regions_dropdown("-- Select --");
        COVID_SANDBOX_NS.fill_regions_dropdown(COVID_SANDBOX_NS.affected_data[COVID_SANDBOX_NS.get_context()].region_list);
    });

    //Event handler for arrange button
    $('#arrange_button').click(function() {
        "use strict";
        COVID_SANDBOX_NS.arrange_region_labels();
    });


    //Event handler for clip bounding box
    $('#clip_bound_button').click(function() {
        "use strict";
        COVID_SANDBOX_NS.clip_bounding_box_by_graph(); 
    });

    //Event for window size change:
    $( window ).resize(function() {
        waitForFinalEvent(function(){
            inform("Called");
            if (this.width == COVID_SANDBOX_NS.viewport_width) {
                COVID_SANDBOX_NS.hold_resize = false;
                return;
            }
            COVID_SANDBOX_NS.viewport_width = $(window).width;
            if (COVID_SANDBOX_NS.hold_resize) return;
            COVID_SANDBOX_NS.hold_resize = true;
    
            var _region_list = COVID_SANDBOX_NS.regions_of_interest;
            var buffer = [];
            for (var i = 0; i< _region_list.length; i++) {
                var try_region = COVID_SANDBOX_NS.create_region_of_interest(buffer, _region_list[i].region, _region_list[i].context)
            }
            inform(buffer);
            COVID_SANDBOX_NS.clear_all(false);
            COVID_SANDBOX_NS.initialize_graph();
            inform(buffer);
            // var num = buffer.length;
            // if (num > 35) {
            //     num = 10;
            // }
            for (var i = 0; i < buffer.length; i++) {
                // COVID_SANDBOX_NS.create_region_of_interest(COVID_SANDBOX_NS.regions_of_interest, buffer[i].region, buffer[i].context)
                COVID_SANDBOX_NS.add_region_to_graph(buffer, i);
            }
            COVID_SANDBOX_NS.regions_of_interest = buffer;
            COVID_SANDBOX_NS.hold_resize = false;
          }, 500, "Graph update" + _date_timer.getTime());
       
      });

    //Timer for rolling day avg input box check
    function check_for_avg_change() {
        "use strict";

        var val = $('#rolling_days').val(); //Get
        // var val2 = $('#rollingavgslider').val(); //Get
        var checked = $('#sevendayavg').is(':checked');

        if (val == COVID_SANDBOX_NS.last_rolling_val && checked == COVID_SANDBOX_NS.last_rolling_bool) return; //Nothing has actually changed so return


        if (val < 3) val = 3; //Rolling averages only make sense when they're above 1...
        if (val % 2 == 0) {   //...and odd
            inform("The rolling day average must be odd.");
            val --;
            $('#rolling_days').val(val) //Set
        }

        COVID_SANDBOX_NS.rolling_day_value = val;
        COVID_SANDBOX_NS.update_rolling_average(COVID_SANDBOX_NS.regions_of_interest, true);

        COVID_SANDBOX_NS.last_rolling_val = val;
        // this.last_val2 = val;
        COVID_SANDBOX_NS.last_rolling_bool = checked;
        inform(COVID_SANDBOX_NS.board);
    }
    // setInterval(check_for_avg_change, 1000);

});




