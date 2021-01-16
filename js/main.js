
//Global definitions and functions
//--------------------------------------------------------------------------------------------

// const JXG = require("../third party/jsxgraphsrc");

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


// check if object is a string, Orwellophile (stackoverflow) 
function isString(x) {
    return Object.prototype.toString.call(x) === "[object String]"
}


//--------------------------------------------------------------------------------------------

//Our namespace to prevent interferring with other libraries or the window namespace
var SPICY_COVID_NS = {

    point: function(x,y){this.x=x; this.y=y;},

    x_axis_style: 'dates',

    ranking: "Total",
    days: 15,

    months_abbreviated: false,
    months_run: 0, // doesnt need to fill up namespace
    date_labels: [], // same
    abbv_date_labels: [], // same
    xaxis: {},
    abbv_xaxis: {},

    logistic_gap: 21, //x buffer we use to tinker with logistic regression / mainly prevents large vertical lines at 0 index of generated curves
    days_threshold: 28, //minimum section length for linear regression comparisons
    angle_threshold: 30, //angle in degrees to start distinguishing for wave separation logic
    root_angle_threshold: 45,
    segment_angle_threshold: 30,
    predicted_days: 21, //minimum run length ahead of current run to compare via linear regression
    minimum_partial: 1, //minimum length of a rise or decay run to train our subsequent logistic regression algorithm
    logistic_parameters: [2**21, 1, 2**21, 1], //default base exponentiation multipler (rise), exponent (rise), base multipler (decay), exponent (decay) 
    crop: 0, //days to ignore at end of curve generation because of delayed reporting
    prediction_length: 30 * 3, //Can also set to Infinity for the prediction waves

    generated_curves_sum: [],
    generated_curves: [],

    //For holding updating graph regions on window.resize()
    hold_resize: false,

    filled_graphs: true,

    //Used for rolling avg changes in window
    last_rolling_val: -1,
    last_rolling_bool: -1,

    // region_list:[[]],  //Unique regions avaiable in our dataset, organized by dataset
    regions_of_interest:[],
    browser_context_list:{},

    browser_context: 'desktop',

    max_date: 0, //Number of days of records (for graph visual)
    run: 0, //Number of days of records for data (doesnt include Spanish Flu)
    max_affected: 0, //Highest deaths / cases
    board: NaN,
    rolling_day_average_enabled: true,
    rolling_day_value: NaN,

    last_updated_date: 0,

    region_context: "US",
    affected_context: "Cases",

    viewport_width:$(window).width(),
    viewport_height:$(window).height(),

    //Graphs template, data structure used like:
    // this.graphs[graph_index].graph_data_obj.dataX[day_index]
    graph_status_obj: function(_name, _region_obj, _data_obj, _arrow_obj,  _rolling, _color, _arrow_peak, _context, _max) {
        "use strict";
        this.name = _name;
        this.graph_region_label_obj = _region_obj; //JSXGraph object for region label on graph
        this.graph_data_obj = _data_obj; //JSXGraph object for graph data
        this.graph_arrow_obj = _arrow_obj;
        this.rolling_day_avg = _rolling; //Bool setting for rolling data (enabled/disabled) //possibly deprecated
        this.color = _color; //Color of JSXGraph region label
        this.arrow_peak = _arrow_peak; //point arrow points to
        this.context = _context;
        this.split_context = SPICY_COVID_NS.interpret_context(_context);
        this.max = _max;
        this.filled = this.filled_graphs;
    },

    graphs: [],

    axis: {x_axis_obj:'', y_axis_obj:''},

 

    // colors for graphs
    custom_colors: {
        0:{value:'#3348FF', gamma: 'dark'}, //blue
        1:{value:'#9133FF', gamma: 'dark'}, //purple
        2:{value:'#FFB433', gamma: 'dark'},  //brown
        3:{value:'#E433FF', gamma: 'dark'},  //magenta
        4:{value:'#33FFF4', gamma: 'bright'},//cyan
        5:{value:'#59FF33', gamma: 'bright'}//green

    },

    // generated_curve_colors: [
    //     '#7fd483', //light gr
    //     '#5ead61', //medium gr
    //     '#327535', //dark gr
    //     '#174d19', //darker gr
    // ],

    //Object for constructing the column name strings for the different datasets.
    header_obj: function(_filename) {
        "use strict";
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
    "use strict";
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

    //Datasets for all regions / contexts
    //Used like:
    //affected_data[filename]
    //->              [filename].data[index][column_name] //actual numerical records
    //->              [filename].columns.affected_column //deaths or cases column name
    //->              [filename].columns.region_context //US or world
    //->              [filename].columns.region_column //State / Country column names
    //->              [filename].columns.date          //date column name
    //->              [filename].region_list          //list of unique sub-regions
    

    affected_data_template: function(_filename, _data) {
        "use strict";
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

    //Regions template, data structure used like:
    //this.regions_of_interest[graph_index].data[days_index][affected_column_name]
    push_region_obj: function(_parent_array, _filename, _data, _region) {
        "use strict";
        var data2 = _data; //this is a required buffer between data & _data <- confirmed
        var columns2 = new this.header_obj(_filename);
        // var context2 = new interpret_context(_filename);
        var context2 = _filename;
        var split_context2 = this.interpret_context(context2); //.affected / .region
        var region2 = _region;
        var obj = {data:data2, columns:columns2, region:region2, context:context2, split_context:split_context2};
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
        "use strict";
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
        "use strict";
        var _return = {region:'',affected:''}
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
        "use strict";
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
    //Datasets for all regions / contexts
    //Used like:
    //affected_data[filename]
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

    //Removes regions with affected (per capita) values == -1
    remove_invalid_regions: function(_filename) {
        "use strict";
        var _data = this.affected_data[_filename];

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

    //Code based on https://www.intmath.com/cg3/jsxgraph-axes-ticks-grids.php
    //Months on x-axis
    alt_x_axis: function() {
        "use strict";
        // JXG.Options.slider.ticks.majorHeight = 0;

        this.board = JXG.JSXGraph.initBoard('jsxbox',{
          boundingbox: [-50,this.max_affected.y,this.max_date+20,-.05], 
          axis:false, 
          renderer: 'canvas',
          showCopyright:false,  
          showNavigation:false,
          zoom: {factorX:1.15,factorY: 1.15,wheel:true,needshift:false,min:0.1},
          pan: {needTwoFingers: false, needShift: false}
         } 
        );
  
        // var xAxPt0 = this.board.create('point', [0,0], {
        //     needsRegularUpdate: false, visible: false});
        // var xAxPt1 = this.board.create('point', [1,0], {
        //     needsRegularUpdate: false, visible: false});

        SPICY_COVID_NS.xaxis = this.board.create('axis', 
            [[0,0],[1,0]], {
            needsRegularUpdate: false,
            majorHeight: 15,
            strokeColor: 'grey',
            fontsize:this.browser_context_list[this.browser_context].axis_font_size
            });
            // inform(this.xaxis);

        SPICY_COVID_NS.abbv_xaxis = this.board.create('axis', 
            [[0,0],[1,0]], {
            needsRegularUpdate: false,
            majorHeight: 15,
            strokeColor: 'grey',
            fontsize:this.browser_context_list[this.browser_context].axis_font_size
        });




        this.xaxis.removeTicks(this.xaxis.defaultTicks);
        this.abbv_xaxis.removeTicks(this.abbv_xaxis.defaultTicks);
        // xaxis_years.removeTicks(xaxis_years.defaultTicks);

        this.months_run = []//[...Array(365).keys()]; //this.max_date
        ;
        var start_date = new Date(2020, 0, 21); //months starts at 0 instead of 1, so this is 1/21/2020
        var date_conversion = 1000*60*60*24;
        var years_run = [];
        var years_array = [];
        var last_year = 0;
        const month_names = ["Jan", "Feb", "Mar", "Apr", "May", "June",
        "July", "Aug", "Sept", "Oct", "Nov", "Dec"
        ];
        // for (var i = 0; i < this.max_affected.x+60; i++) {
        for (var i = 0; i < 365*3; i++) {
            var new_date = new Date(start_date.getTime() + i * date_conversion);
            if (new_date.getDate() == '1') {
                var year = String(new_date.getFullYear());
                year = year.slice(2);
                years_array.push('\'' + year);
                years_run.push(i);
                // var date_str = (new_date.getMonth() + 1) + '/' + new_date.getDate() //+ '/' + year;  //have to add one since months start at 0
                var date_str = month_names[new_date.getMonth()];  // + year;
                var abb_date_str = date_str.slice(0,1);
                this.months_run.push(i-1);
                this.date_labels.push(date_str);
                this.abbv_date_labels.push(abb_date_str);
            }
        }
        
        //Months
        this.xaxis.ticks = this.board.create('ticks', [this.xaxis, 
            this.months_run], {
            labels: this.date_labels,
            majorHeight: 15, 
            drawLabels: true, 
            needsRegularUpdate: false,
            visible: true,
            label: {
                visible: true,
                cssClass:"region_labels_bright",
                highlight: false,
                offset:[0,-20],
                fontsize:this.browser_context_list[this.browser_context].axis_font_size,
                anchorX: 'left', anchorY: 'bottom',
                fontsize:this.browser_context_list[this.browser_context].axis_font_size
            },
            // precision:5
          });
          
        this.abbv_xaxis.ticks = this.board.create('ticks', [this.abbv_xaxis, 
            this.months_run], {
            labels: this.abbv_date_labels,
            majorHeight: 15, 
            drawLabels: false, 
            needsRegularUpdate: false,
            visible: false,
            label: {
                visible: true,
                cssClass:"region_labels_bright",
                highlight: false,
                offset:[0,-20],
                fontsize:this.browser_context_list[this.browser_context].axis_font_size,
                anchorX: 'left', anchorY: 'bottom',
                fontsize:this.browser_context_list[this.browser_context].axis_font_size
            },
            // precision:5
          });
        // var ticks_years = this.board.create('ticks', [xaxis_years, 
        // years_run], {
        // labels: years_array,
        // majorHeight: 15, 
        // drawLabels: true, 
        // needsRegularUpdate: false,
        //     label: {
        //         cssClass:"region_labels_bright",
        //         highlight: false,
        //         offset:[0,0],
        //         fontsize:this.browser_context_list[this.browser_context].axis_font_size,
        //         anchorX: 'left', anchorY: 'bottom',
        //     },
        // });

        inform(this.xaxis);
        // var xTicks, yTicks, bb;
        var yTicks, bb;
        // xaxis.defaultTicks.ticksFunction = function () { return xTicks; };
        this.board.fullUpdate(); // full update is required
        var coords=[];
        var xPt0 = function(offset) {
            coords = new JXG.Coords(JXG.COORDS_BY_SCREEN, [0, offset], SPICY_COVID_NS.board);	
            return coords.usrCoords;
        }
        var xPt1 = function(offset) {
            coords = new JXG.Coords(JXG.COORDS_BY_SCREEN, [SPICY_COVID_NS.board.canvasWidth, offset], SPICY_COVID_NS.board);
            return coords.usrCoords;
        }
        var yAxPt0 = this.board.create('point', [0,0], {
            needsRegularUpdate: false, visible: false});
        var yAxPt1 = this.board.create('point', [0,1], {
            needsRegularUpdate: false, visible: false});	

        var yaxis = this.board.create('axis', [yAxPt0,yAxPt1], {
            needsRegularUpdate: false, 
            ticks:{
                scaleSymbol: '%',
                label:{offset:[10,0],precision:8,
                    fontsize:this.browser_context_list[this.browser_context].axis_font_size}
            } 
          }
        );

        yaxis.defaultTicks.ticksFunction = function () { return yTicks; };
        this.board.fullUpdate();
        var yPt0 = function(offset) {
            coords = new JXG.Coords(JXG.COORDS_BY_SCREEN, [offset,SPICY_COVID_NS.board.canvasHeight], SPICY_COVID_NS.board);
            return coords.usrCoords;
        }
        var yPt1 = function(offset) {
            coords = new JXG.Coords(JXG.COORDS_BY_SCREEN, [offset,0], SPICY_COVID_NS.board);
            return coords.usrCoords;
        }
        var setTicks = function() {
            var bb = SPICY_COVID_NS.board.getBoundingBox();
            var yTicksVal = Math.pow(10, Math.floor((Math.log(0.6*(bb[1]-bb[3])))/Math.LN10)); //changed from .6 to .006
            if( (bb[1]-bb[3])/yTicksVal > 5) {
              yTicks = yTicksVal;
            } else {
              yTicks = 0.5* yTicksVal;
            }
            SPICY_COVID_NS.board.fullUpdate(); // full update is required
        }
        setTicks();
        var origPt = this.board.create('point', [0,0],{visible:false});
        this.board.on('boundingbox', function() {
            var bb = SPICY_COVID_NS.board.getBoundingBox();
            var mycoordsY = new JXG.Coords(JXG.COORDS_BY_USER, [0,origPt.Y()], SPICY_COVID_NS.board);
            var yPixels = mycoordsY.scrCoords[2];
            var mycoordsX = new JXG.Coords(JXG.COORDS_BY_USER, [0,origPt.X()], SPICY_COVID_NS.board);
            var xPixels = mycoordsX.scrCoords[1];

            //Next section commented out because it slows down panning too much:
            // if( 30 > yPixels) {	
            //     xAxPt0.moveTo (xPt0(40),0); //4
            //     xAxPt1.moveTo (xPt1(40),0); //4
            //     xaxis.point1.setAttribute({frozen: true});
            //     xaxis.point2.setAttribute({frozen: true});
            //     xaxis.setAttribute({strokeColor: '#111'});
            //     ticks.visProp.label.offset = [0,-20];
            // } else if( yPixels > SPICY_COVID_NS.board.canvasHeight - 30) {
            //     xAxPt0.moveTo (xPt0(SPICY_COVID_NS.board.canvasHeight -10),0); //-10
            //     xAxPt1.moveTo (xPt1(SPICY_COVID_NS.board.canvasHeight - 10),0); //-10
            //     xaxis.point1.setAttribute({frozen: true});
            //     xaxis.point2.setAttribute({frozen: true});
            //     xaxis.setAttribute({color: '#111'});
            //     xaxis.setAttribute({strokeColor: '#111'});
            //     ticks.visProp.label.offset = [0,20];
            // } else {
            //     xaxis.point1.setAttribute({frozen: false});
            //     xaxis.point2.setAttribute({frozen: false});
            //     xaxis.setAttribute({color:'#666'});
            //     xAxPt0.moveTo ([0,0],0);
            //     xAxPt1.moveTo ([1,0],0);
            //     ticks.visProp.label.offset = [0,-20];
            // }	
            if( 30 > xPixels) {
                yAxPt0.moveTo (yPt0(25),0); //5
                yAxPt1.moveTo (yPt1(25),0); //5
                yaxis.point1.setAttribute({frozen: true});
                yaxis.point2.setAttribute({frozen: true});
                yaxis.setAttribute({strokeColor: '#111'});
                yaxis.defaultTicks.visProp.label.offset = [7,0]; //7
            } else if( xPixels > SPICY_COVID_NS.board.canvasWidth-30) {

                yAxPt0.moveTo (yPt0(SPICY_COVID_NS.board.canvasWidth-25),0); //-5
                yAxPt1.moveTo (yPt1(SPICY_COVID_NS.board.canvasWidth-25),0); //-5
                yaxis.point1.setAttribute({frozen: true});
                yaxis.point2.setAttribute({frozen: true});			
                yaxis.setAttribute({strokeColor: '#111'});
                yaxis.defaultTicks.visProp.label.offset = [-35,0]; //-28
                yaxis.defaultTicks.visProp.label.align = 'right';
            } else {           
                yaxis.point1.setAttribute({frozen: false});
                yaxis.point2.setAttribute({frozen: false});
                yaxis.setAttribute({strokeColor: '#666'});
                yAxPt0.moveTo ([0,0],0);
                yAxPt1.moveTo ([0,1],0);
                yaxis.defaultTicks.visProp.label.offset = [7,0]; //7
            }
            setTicks();
        });
    },

    increase_brightness:function(hex, percent){
        "use strict";
        // strip the leading # if it's there
        inform(hex);
        hex = hex.replace(/^\s*#|\s*$/g, '');
    
        // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
        if(hex.length == 3){
            hex = hex.replace(/(.)/g, '$1$1');
        }
    
        var r = parseInt(hex.substr(0, 2), 16),
            g = parseInt(hex.substr(2, 2), 16),
            b = parseInt(hex.substr(4, 2), 16);
    
        return '#' +
           ((0|(1<<8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
           ((0|(1<<8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
           ((0|(1<<8) + b + (256 - b) * percent / 100).toString(16)).substr(1);
    },
    

    //Removes scientific notation
    number_to_string: function (num) {
        "use strict";
        let numStr = String(num);

        if (Math.abs(num) < 1.0)
        {
            let e = parseInt(num.toString().split('e-')[1]);
            if (e)
            {
                let negative = num < 0;
                if (negative) num *= -1
                num *= Math.pow(10, e - 1);
                numStr = '0.' + (new Array(e)).join('0') + num.toString().substring(2);
                if (negative) numStr = "-" + numStr;
            }
        }
        else
        {
            let e = parseInt(num.toString().split('+')[1]);
            if (e > 20)
            {
                e -= 20;
                num /= Math.pow(10, e);
                numStr = num.toString() + (new Array(e + 1)).join('0');
            }
        }

        return numStr;
    },

     // Base logistic regression equation function /w decay 
     func_base: function(xi, gen_curve, multiplier) {
        "use strict";
        // inform(gen_curve, curve_index);
        var P = gen_curve.Parms;
        var top = gen_curve.top ;
        var riser = gen_curve.riser;
        if (!gen_curve.x_offset) gen_curve.x_offset = 0;
        var x_off = gen_curve.x_offset;

        var base = xi - x_off + SPICY_COVID_NS.logistic_gap;
        var length = gen_curve.length;

        var first_order = 1 + P[0]*base**P[1];

        var second_order =  1 + P[2]*base**P[3];

        // inform (test);
        if (first_order == NaN || second_order == NaN) return 0;
        else {
            if (multiplier)
                var ret_value = (top-riser) / first_order - (top-riser) / second_order + (((length - base) > 0) ? ((length - base) / (length) * riser) : 0);
            else
                var ret_value = (top-riser) / first_order - (top-riser) / second_order + riser;
        } 
        return ret_value;
        // return (top + riser) / (1 + P[0]*(xi + x_off)**Math.abs(P[1])) - (top + riser) / (1 + P[2]*P[3]**-(xi + x_off)) + riser;
    },


    func_base_sum: function(xi, P) {
        "use strict";
        // var P = SPICY_COVID_NS.generated_curves_sum.Parms;
        var curves_num = SPICY_COVID_NS.generated_curves_sum.curves_num;
        // inform(P);
        var result = 0;
        for (var i = 0; i < curves_num; i ++) {
            var x_off = SPICY_COVID_NS.generated_curves[i].x_offset;
            // if (xi < x_off + SPICY_COVID_NS.logistic_gap) continue;
            var base = xi - x_off + SPICY_COVID_NS.logistic_gap; //- peaks_and_valleys.start + this.logistic_gap;
            var index = i * curves_num;
            var top = SPICY_COVID_NS.generated_curves_sum.peaks_and_valleys[i].peak.y;
            var res = top/(1 + P[index]*base**P[index+1]) - top/(1 + P[index+2]*base**P[index+3]);
            if (res > 0) {
                // inform(res);
                result += res;
            }
        }
        return result;

    },

    logistic_regression_with_decay_one_curve: function(peaks_and_valleys, Parms_collect) {
        "use strict";
        var curves_num = peaks_and_valleys.length;
        var graph_index = this.graphs.length-1;

        var y = this.graphs[graph_index].graph_data_obj.dataY;
        var x = this.graphs[graph_index].graph_data_obj.dataX;
        // var top = Math.max(...y);

        //if we dont have parms lets generate some based on default values
        //Parms_collect = !Parms_collect;
        if (!Parms_collect) {
            var Parms_collect = [];
            for (var i = 0; i < curves_num; i++) {
                this.logistic_parameters.forEach(element => Parms_collect.push(element));
                // Parms_collect.push(.01);
            }
        }

        // this.generated_curves_sum.Parms = Parms_collect;
        this.generated_curves_sum.curves_num = curves_num;
        this.generated_curves_sum.peaks_and_valleys = peaks_and_valleys;
        


        inform(Parms_collect);
        this.generated_curves_sum.Parms = fminsearch(SPICY_COVID_NS.func_base_sum, Parms_collect, x, y, {maxIter:100,display:false, step_style: true, func2: SPICY_COVID_NS.func_base, curves: SPICY_COVID_NS.generated_curves});
        inform(this.generated_curves_sum.Parms );

        var graph_color = this.graphs[this.graphs.length-1].graph_data_obj.getAttribute("strokeColor");
        this.generated_curves_sum.curve = this.board.create('functiongraph',
        [function(_x){ return SPICY_COVID_NS.func_base_sum(_x, SPICY_COVID_NS.generated_curves_sum.Parms)},
            SPICY_COVID_NS.generated_curves_sum.peaks_and_valleys[0].start, // a < x (left bounds)
            x.length+SPICY_COVID_NS.prediction_length // b < x (right bounds)
        ], {
            strokeColor: graph_color,
            dash: 5,
            strokewidth: 2
        });

        //Draw underlying curves:
        // inform(this.generated_curves);

        for (var curve_index = 0; curve_index < this.generated_curves.length; curve_index++) {
        
            for (var i = 0; i < 4; i ++) { //might not be needed, oddly
                // inform(this.generated_curves[curve_index].Parms);
                this.generated_curves[curve_index].Parms[i] = this.generated_curves_sum.Parms[4*curve_index+i];

            }
            var curve = this.generated_curves[curve_index];
            (function(cur){ //ugly hack to give the curve proper scope to hold the proper curve index within the loop
                SPICY_COVID_NS.generated_curves[curve_index].curve = SPICY_COVID_NS.board.create('functiongraph',
                // [function(_x){ return SPICY_COVID_NS.fun_base(_x, SPICY_COVID_NS.generated_curves);},
                [function(_x){return SPICY_COVID_NS.func_base(_x, cur);},
                    0, // a < x (left bounds)
                    x.length+SPICY_COVID_NS.prediction_length // b < x (right bounds)
                ], {
                    strokeColor: graph_color,
                    dash: 1,
                    strokewidth: 2
                });
            })(curve);

            var str = "Function for Curve " + (curve_index+1) + ":\n";
            var top = this.number_to_string(curve.top);
            var Parms = curve.Parms.map(element => SPICY_COVID_NS.number_to_string(element)); //consider changing to forEach instead of creating new array
            var x_off = curve.x_offset;
            str += "y_" + (curve_index+1) + " = " + top + "/(1+" + Parms[0] + "*(x-"+x_off+")^{"+ Parms[1] + "})-" +  top + "/(1+" + Parms[2] + "*(x-"+x_off+")^{"+ Parms[3] + "})";  
            var divider_str = "\n*****************************\n\n*****************************\n";
            $('#console').val(str + divider_str + $('#console').val());
    


        }
        inform(this.generated_curves);
        inform(this.generated_curves_sum.Parms);

        // for(var i = 0; i < length; i++){
        //     var variable = variables[i];
        //     otherVariable.doSomething(variable, function(err){ //callback for when doSomething ends
        //       do something else with variable;
        //     }


        // for(var i = 0; i < length; i++) {
        //     var variable = variables[i];
        //     otherVariable.doSomething(function(v) {
        //         return function(err) {
        //              /* something with v */ 
        //             }; 
        //         }(variable));
        //   }
      
        //   for(var i = 0; i < length; i++){
        //     var variable = variables[i];
        //     (function(var){ //start wrapper code
        //       otherVariable.doSomething(var, function(err){ //callback for when doSomething ends
        //         do something else with var; //please note that i'm dealing with var here, not variable
        //       }
        //     })(variable);//passing in variable to var here
        //   }






    },

   
    //The approach is to use a cost function to do the regression
    //We divide the segment into before peak / after peak, regress those, and use those as initial values for the full function regression
    logistic_regression_with_decay: function(index, segment, _curve) {
        "use strict";


        var y_data = this.graphs[index].graph_data_obj.dataY;
        var x_data = this.graphs[index].graph_data_obj.dataX;

        if (segment.multiplier) { //This is for the last "predictive" curves
            var y = y_data.slice(segment.start,segment.end-this.crop);
            var x = x_data.slice(segment.start,segment.end-this.crop);
            var top = Math.max(...y) * segment.multiplier;
            var riser = Math.min(...y);//* (1 / _multiplier);
        }
        else { //This is for the former curves
            var y = y_data.slice(segment.start, segment.end);
            var x = x_data.slice(segment.start, segment.end);
            var top = Math.max(...y);
            var riser = Math.min(...y);
        }
        riser = 0;
        // inform(y);

        // if (this.filled_graphs) { //completely, 100%, have no idea, why this is needed for filled graphs -_-
        //     y.splice(y.length-1, 1);
        // }

        // inform(y);

        //Next 2 lines are to normalize the offset to help logistic exponent regression because exponential-esque regression has a tough time with high x values
        var x_off = x[0];
        var x = x.map( element => element - x_off + this.logistic_gap);
        var length = x.length;

        var highest_peak = function (_data) {
            var _peak = {x:0,y:0};

            for (var i = 0; i < _data.length; i++) {
                if (_data[i] > _peak.y) {
                    _peak.y = _data[i];
                    _peak.x = i;
                }
            }
            return _peak;
        }

        var peak = highest_peak(y);
        var y_rise = y.slice(0, (peak.x+1<y.length) ? peak.x+1 : y.length);
        var x_rise = x.slice(0, (peak.x+1<x.length) ? peak.x+1 : x.length);

        var y_decay = y.slice(peak.x);
        var x_decay = x.slice(peak.x);

        if (segment.multiplier) { //look at slope, top, and riser again because now we have peak location
            segment.direction = this.do_linear_regression_graph(index, peak.x+x_off, x.length+x_off);
            if (y_decay.length < this.crop || this.crop <= 0) { //the end curve is so close to the end of the dataset, just assume its positive.
                segment.direction.slope = 1;
            }
            else if (segment.direction.slope < 0) { //We have an overall negative slope
                // riser /= segment.multiplier;
                length *= segment.multiplier;
                top = Math.max(...y);
            }
            
        }
        
        // inform(riser, y);
        //This is depecrated by this.fun_base
        if (segment.multiplier) {
            var func = function(_x,P) { // Logistic rise and decay used for regression
                return [].map.call(_x, function(xi) {
                    var base = xi;

                    var first_order = 1 + P[0]*base**P[1];

                    var second_order =  1 + P[2]*base**P[3];

                    if (first_order == NaN || second_order == NaN) return 0;
                    else var ret_value = (top-riser) / first_order - (top-riser) / second_order + (((length - xi) > 0) ? ((length - xi) / (length) * riser) : 0);
                    return ret_value;
                });
            };
        }
        else {
            var func = function(_x,P) { // Logistic rise and decay used for regression
                return [].map.call(_x, function(xi) {
                    var base = xi;

                    var first_order = 1 + P[0]*base**P[1];

                    var second_order =  1 + P[2]*base**P[3];

                    if (first_order == NaN || second_order == NaN) return 0;
                    else var ret_value = (top-riser) / first_order - (top-riser) / second_order +  riser;
                    return ret_value;
                });
            };
        }

        var rise_func = function(_x,P) { //Only the rise before the peak
            return [].map.call(_x, function(xi) {
                var base = xi;

                var second_order =  1 + P[0]*base**P[1];

                if (second_order == NaN) return 0;
                else var ret_value = (top-riser) / second_order + riser;
                return ret_value;
            });
        };

        var decay_func = function(_x,P) { //Only the decay after the peak
            return [].map.call(_x, function(xi) {
                var base = xi;

                var second_order =  1 + P[0]*base**P[1];

                if (second_order == NaN) return 0;
                else var ret_value = top - (top / second_order); //not including the riser here drastically improves the decay end of the curves
                return ret_value;
            });
        };






        //Attempt to add bias to start, peaks, and ends just to see if it improved the regression
        // var _length = Math.floor(y.length / 3 +1);

        // //Start
        // var y_add_on = [...Array(_length)].fill(0);
        // var x_add_on = [...Array(_length)].fill(x[0]);

        // y = y_add_on.concat(y);
        // x = x_add_on.concat(x);
        // if (!segment.multiplier && !segment.last) { //don't do this for the last curves
        //     // Peak
        //     y_add_on = [...Array(_length)].fill(y[peak.x]);
        //     x_add_on = [...Array(_length)].fill(x[peak.x]);
        //     // inform(x_add_on, y_add_on);
        //     var x_t = [];
        //     var y_t = [];
        //     y = x_t.concat(y.slice(0, (peak.x+1<y.length) ? peak.x+1 : y.length), y_add_on, y.slice(peak.x));
        //     x = y_t.concat(x.slice(0, (peak.x+1<y.length) ? peak.x+1 : x.length), x_add_on, x.slice(peak.x));

        //     //End

        //     y_add_on = [...Array(_length)].fill(0);
        //     x_add_on = [...Array(_length)].fill(x[x.length-1]);

        //     y = y.concat(y_add_on);
        //     x = x.concat(x_add_on);
        // }
        // inform(x,y);

        var graph_color = this.graphs[this.graphs.length-1].graph_data_obj.getAttribute("strokeColor");

        // inform(y_decay[0], y_rise[x_rise.length-1]);
        var Parms = [];
        if (y_rise.length > this.minimum_partial) {
            var Parms_rise = fminsearch(rise_func, [this.logistic_parameters[0], this.logistic_parameters[1]], x_rise, y_rise, {maxIter:6000,display:false});
            // Parms[0] = Parms_rise[0];
            // Parms[1] = Parms_rise[1];
            Parms.push(Parms_rise[0]);
            Parms.push(Parms_rise[1]);
        }
        else {
            Parms.push(this.logistic_parameters[0]);
            Parms.push(this.logistic_parameters[1]);  
        }
        // Parms = fminsearch(fun, this.logistic_parameters, x, y, {maxIter:2000,display:false});
        //The fminsearch function on the final pass is a bit too preferential toward slower decays, which is why we split up peak and decay passes with a 3rd final pass using their values
        //tons of logic is going on here, but the point is for this decay to have a predictive curve at the end which predicts higher top ends for rising slope and slightly slower falls for lowering slopes
        if (segment.multiplier) {             
            if (segment.direction.slope > 0) { //Rising slope, start at 1:
                Parms.push(1);
                Parms.push(1);
            }
            else if (y_decay.length > this.minimum_partial) { //Otherwise if our peak is far enough away from the end of the dataset do a decay run:
                Parms_decay = fminsearch(decay_func, [this.logistic_parameters[2], this.logistic_parameters[3]], x_decay, y_decay, {maxIter:6000,display:false});
                Parms.push(Parms_decay[0]);
                Parms.push(Parms_decay[1]);

                //Reverse colors:

                segment.color = this.increase_brightness(graph_color, (4-segment.extra) * 20);
                

            }
        }
        else if (y_decay.length > this.minimum_partial) { //decay run for a non-end run
            var Parms_decay = fminsearch(decay_func, [this.logistic_parameters[2], this.logistic_parameters[3]], x_decay, y_decay, {maxIter:6000,display:false});
            Parms.push(Parms_decay[0]);
            Parms.push(Parms_decay[1]);
        }
        
        
        if (Parms.length < 3) { //Just in case we didnt get any hits for decay: (not sure if this is needed anymore)
            Parms.push(this.logistic_parameters[2]);
            Parms.push(this.logistic_parameters[3]);
        }
 
        inform("Defaults:", this.logistic_parameters);
        inform("Adjusted:", Parms, [top, riser]);
        // this.generated_curves_sum.Parms = fminsearch(SPICY_COVID_NS.func_base_sum, Parms_collect, x, y, {maxIter:100,display:false, step_style: true, func2: SPICY_COVID_NS.func_base, curves: SPICY_COVID_NS.generated_curves});
       
        Parms = fminsearch(func, Parms, x, y, {maxIter:200,display:false});
        // Parms = fminsearch(fun, this.logistic_parameters, x, y, {maxIter:2000,display:false});
        inform("Adjusted Twice:", Parms, [top, riser]);
        // Parms = fminsearch(fun, Parms, x, y, {maxIter:2000,display:false});
        

        this.generated_curves.push({});
        var _curves_index = this.generated_curves.length-1;
        this.generated_curves[_curves_index].Parms = Parms;
        this.generated_curves[_curves_index].top = top;
        this.generated_curves[_curves_index].riser = riser;
        this.generated_curves[_curves_index].start = segment.start;
        this.generated_curves[_curves_index].end = segment.end;
        this.generated_curves[_curves_index].x_offset = x_off;
        this.generated_curves[_curves_index].length = length;
  
        //Draw graphs

        // if (!segment.multiplier) {
        //     this.generated_curves[_curves_index].curve = this.board.create('functiongraph',
        //         [function(_x){ return SPICY_COVID_NS.fun_base(_x, this.generated_curves[_curves_index]);},
        //             SPICY_COVID_NS.generated_curves[_curves_index].start, // a < x (left bounds)
        //             SPICY_COVID_NS.generated_curves[_curves_index].end // b < x (right bounds)
        //         ], {
        //             strokeColor: (!segment.color) ? graph_color : segment.color,
        //             dash: 5,
        //             strokewidth: 2
        //         }
        //     );
        // }
        // else {
        //     this.generated_curves[_curves_index].curve = this.board.create('functiongraph',
        //     [function(_x){ return SPICY_COVID_NS.fun_base(_x, this.generated_curves[_curves_index], segment.multiplier);},
        //         SPICY_COVID_NS.generated_curves[_curves_index].start, // a < x (left bounds)
        //         SPICY_COVID_NS.generated_curves[_curves_index].end // b < x (right bounds)
        //     ], {
        //         strokeColor: (!segment.color) ? graph_color : segment.color,
        //         dash: 5,
        //         strokewidth: 2
        //     }
        // );
        // }
        
        
        
        var str = "Function for Curve " + _curve + ":\n";
        top = this.number_to_string(top);
        riser = this.number_to_string(riser);
        var _end = this.number_to_string(segment.end);
        Parms = Parms.map(element => SPICY_COVID_NS.number_to_string(element)); //consider changing to forEach instead of creating new array
        str += "y_" + _curve + " = {x<"+_end+"} (" + top + "+" + riser + ")/(1+" + Parms[0] + "*(x-"+x_off+")^{"+ Parms[1] + "})-" + "(" + top + "+" + riser + ")/(1+" + Parms[2] + "*(x-"+x_off+")^{"+ Parms[3] + "})+" + riser;  
        var divider_str = "\n*****************************\n\n*****************************\n";
        $('#console').val(str + divider_str + $('#console').val());

        return Parms;

    },

    segment_curves: function() {

        var _index = this.graphs.length-1;
        
        if (this.filled_graphs) this.remove_tidy_endpoints(this.graphs[_index].graph_data_obj);
        // var plateau_threshold = this.get_max_graph_affected(_index) / plateau_threshold;
        var _data = this.graphs[_index].graph_data_obj;
        var _data_length = _data.dataX.length;

        var threshold = this.days_threshold; //Minimum days to detect a valley / peak

        var bounding_box = this.board.getBoundingBox(); //returns 4 element array: 0-left, 1-upper, 2-right, 3-lower

        var _scale = (bounding_box[2] - bounding_box[0]) / (bounding_box[1] - bounding_box[3]); //normally rise/run, but since we're transforming data it's 1/(rise/run) anyway
        var to_radians = function(angle) {
            return angle * Math.PI/180;
        }
        var to_degrees = function(angle) {
            return angle * 180/Math.PI;
        }
        var angle_threshold = this.angle_threshold;
        angle_threshold = to_radians(angle_threshold); //convert to radians
        var run_reg = 0;
        // inform((angle_threshold * 180/Math.PI)/ _scale);
        // inform(_scale);

        var peaks_and_valleys = [];
        var run_start_x = 0;
        var peak_index = 0;



        var check_for_valley = function(__data, start_x, end_x) {
            "use strict";
            var valley = {x:0, y:Infinity};
            for (var i = start_x; i < end_x; i ++)
            {
                if (__data.dataY[i] <= valley.y) {
                    valley.x = i;
                    valley.y = __data.dataY[i];
                }
            }
            return valley;
        }

        // var avg_slope = 0;

        var find_peak = function(__data, start_x, end_x) { //some intelligent peak detection, based on angle of linear regression of entire segment first, failing that average of bisection linear regression at the midpoint
            "use strict";
            if (end_x > __data.dataX.length) end_x = __data.dataX.length;
            var just_find_peak = false;
            // angle_threshold = (angle_threshold * Math.PI/180)
            var segment_lin_reg = SPICY_COVID_NS.do_linear_regression_graph(_index, start_x, end_x);
            var segment_angle = Math.atan(segment_lin_reg.slope * _scale);
            var _angle_threshold = to_radians(SPICY_COVID_NS.segment_angle_threshold);
            if (segment_angle >= _angle_threshold || segment_angle < -_angle_threshold) {
                just_find_peak = true;
            }

            var peak = {x:0, y:0};

            if (just_find_peak) {

                for (var i = start_x; i < end_x; i ++)
                {
                    if (__data.dataY[i] >= peak.y) {
                        peak.x = i;
                        peak.y = __data.dataY[i];
                    }
                }
            }
            else {
                var midpoint = (start_x + end_x) / 2;
                var lin_reg1 = SPICY_COVID_NS.do_linear_regression_graph(_index, start_x, midpoint);
                var lin_reg2 = SPICY_COVID_NS.do_linear_regression_graph(_index, midpoint, end_x);
                peak.x = midpoint;

                var start = start_x;
                var end = end_x;
                var func_line = function(x, slope, intercept) { //abstract a linear function
                    return x*slope + intercept;
                }
                peak.y = (func_line(end, lin_reg1.slope, lin_reg1.intercept) + func_line(start, lin_reg2.slope, lin_reg2.intercept))/2;
                inform(start_x,midpoint, end_x, to_degrees(segment_angle));
                inform(lin_reg1, lin_reg2);
                var a = func_line(end, lin_reg1.slope, lin_reg1.intercept);
                inform(a);
                inform(func_line(end, lin_reg1.slope, lin_reg1.intercept),func_line(start, lin_reg2.slope, lin_reg2.intercept));
            }
            return peak;
        }
        
        for (var x = 0; x < _data_length; x++) {
            var current_y = _data.dataY[x];
            // threshold = (x > this.days_threshold) ? this.days_threshold : x;

            if (current_y > 0 && run_start_x == 0) { //Begin Runs
                run_start_x = x;
                if (x > threshold) x += threshold; // skip ahead
            }

            if (x - run_start_x >= threshold  || x == _data_length-1) {
                run_reg = this.do_linear_regression_graph(_index, x - threshold, x); // find slope of last (x - threshold) run
                var x2 = x;
                var x2_length = (x2 + this.predicted_days < _data_length) ? x2 + this.predicted_days : _data_length
                var projected_run_reg = this.do_linear_regression_graph(_index, x2, x2_length); // find slope of forward run
 
                // inform(projected_run.slope, run_reg.slope, angle_threshold);
                // inform(Math.atan(lin_reg.slope - run_slope.slope));
                if ((Math.atan(projected_run_reg.slope * _scale) - Math.atan(run_reg.slope * _scale)  >= angle_threshold) || x == _data_length-1) { //We're past 30 from prior slope, so close off that section, and start next one
                    // inform(Math.atan(projected_run.slope)*180/Math.PI, Math.atan(run_reg.slope)*180/Math.PI, -angle_threshold*180/Math.PI);
                    var valley = check_for_valley(_data, x2, x2_length);
                    x = valley.x;
                    peaks_and_valleys.push({})
                    inform(run_start_x);
                    peaks_and_valleys[peak_index].start = run_start_x;
                    // if (x == _data_length-1 || x == _data_length) peaks_and_valleys[peak_index].end = Infinity;
                    // else peaks_and_valleys[peak_index].end = x;
                    if (_data_length - x < this.crop || (this.crop == 0 && _data_length - x < 14)) { //if we're a (14 days) from the end just call it the last curve and break
                        peaks_and_valleys[peak_index].end = _data_length + this.prediction_length; //Could also set to Infinity;
                        peaks_and_valleys[peak_index].peak = find_peak(_data, run_start_x, peaks_and_valleys[peak_index].end);
                        // avg_slope = this.do_linear_regression_graph(_index, run_start_x, _data_length-this.crop);
                        break;
                    }
                    else {
                        peaks_and_valleys[peak_index].end = x;
                        peaks_and_valleys[peak_index].peak = find_peak(_data, run_start_x, x);
                        
                    // if (_data.dataY[peaks_and_valleys[peak_index].start] < _data.dataY[x]) peaks_and_valleys[peak_index].riser = current_y;
                    // else peaks_and_valleys[peak_index].riser = _data.dataY[peaks_and_valleys[peak_index].start];
                    
                        peak_index ++;
                        run_start_x = x;
                        x = (x + threshold >= _data_length-1) ? x : x + threshold;
                    }

                }

            }

        }
      
        segments = [];
        var potential_root = function(_i, side) {
            var x1 = peaks_and_valleys[_i].peak.x;
            var y1 = peaks_and_valleys[_i].peak.y;
            var root_angle_threshold = this.root_angle_threshold;
            if (side == "right") {
                var x2 = peaks_and_valleys[_i+1].peak.x
                // var slope = y1/(x2-x1);
                // var angle = Math.atan(slope * _scale)
                var new_slope = Math.tan(to_radians(-root_angle_threshold));
                var new_x =  y1/new_slope+x1
                if (new_x < x2) return new_x;
                else return x2;

            }
            else {
                if (_i == 0 && peaks_and_valleys[_i].start == 0) var x2 = -Infinity; //For China
                else var x2 = peaks_and_valleys[_i-1].peak.x
                // var slope = y1/(x1-x2);
                // var angle = Math.atan(slope * _scale)
                var new_slope = Math.tan(to_radians(root_angle_threshold));
                var new_x = y1/-new_slope+x1
                if (new_x > x2) return new_x;
                else return x2;
            }
        }
        
        inform(peaks_and_valleys);
        if (peak_index == 0) {
            alert("No curves found! Have you tried reducing or disabling moving day average?");
            if (this.filled_graphs) this.add_tidy_endpoints(this.graphs[_index].graph_data_obj);
            return;
        }

        //Re-organize segments into "roots"
        for (var i = 0; i < peaks_and_valleys.length; i++) {

            if (i == 0) { //First curve
                // var r1 = potential_root(0, "left"); //normally we don't have to do this, but for China we do.
                var r2 = potential_root(0, "right");
                segments.push({root1: peaks_and_valleys[0].start, root2: r2, peak: peaks_and_valleys[0].peak});
            }
            else if (i == peaks_and_valleys.length-1) { //Last curve
                var r1 = potential_root(i, "left");
                segments.push({root1: r1, peak: peaks_and_valleys[i].peak});
            }
            else { // all other curves
                var r1 = potential_root(i, "left");
                var r2 = potential_root(i, "right");
                segments.push({root1: r1, root2: r2, peak: peaks_and_valleys[i].peak});
            }
        }

        inform(segments);
        inform(peaks_and_valleys);
        // if (!peaks_and_valleys[peak_index].peak_x) peaks_and_valleys.pop(); // If we don't have a peak for the last index remove the whole index
        return;




        // add three duplicates of last curve to show different scenarios (2x, 4x, and 10x top end):

        // var graph_color = this.graphs[this.graphs.length-1].graph_data_obj.getAttribute("strokeColor");
        // peaks_and_valleys.push({start: peaks_and_valleys[peak_index].start,
        //                         end:  peaks_and_valleys[peak_index].end,
        //                         multiplier: 2,
        //                         color: this.increase_brightness(graph_color, 20),// this.generated_curve_colors[2]
        //                         extra: 1
        // });

        // peaks_and_valleys.push({start: peaks_and_valleys[peak_index].start,
        //                         end:  peaks_and_valleys[peak_index].end,
        //                         multiplier: 4,
        //                         color: this.increase_brightness(graph_color, 40),
        //                         extra: 2
        // });

        // peaks_and_valleys.push({start: peaks_and_valleys[peak_index].start,
        //                         end:  peaks_and_valleys[peak_index].end,
        //                         multiplier: 10,
        //                         color: this.increase_brightness(graph_color, 60),
        //                         extra: 3
        // });

        peaks_and_valleys[peaks_and_valleys.length-1].last = true;
        inform(peaks_and_valleys);
        var Parms_collection = [];
        
        this.generated_curves = [];
        peaks_and_valleys.forEach(function(element, i) {
            inform("-------Curve " + (i+1));
            var ret_value = SPICY_COVID_NS.logistic_regression_with_decay(_index, element, i+1);
            for (var i = 0; i < ret_value.length; i++) {
                Parms_collection.push(Number(ret_value[i]));
            }
            // Parms_collection.push(ret_value.forEach(function(el){ return el;}));
        });

        this.logistic_regression_with_decay_one_curve(peaks_and_valleys, Parms_collection);

        if (this.filled_graphs) this.add_tidy_endpoints(this.graphs[_index].graph_data_obj);
        // var c3 = JXG.joinCurves(SPICY_COVID_NS.board, [SPICY_COVID_NS.generated_curves[0].curve, SPICY_COVID_NS.generated_curves[1].curve], 
        //     {   strokeColor:'black', 
        //         strokeWidth:3, 
        //         fillColor:'yellow', fillOpacity:0.2
        //     });

        
        return;
    },

    generate_curves2: function() {
        this.segment_curves();
    },
    //Determines segments (curves/waves/surges) by a chosen additional angle of slope, then does the logistic regression for each segment
    generate_curves: function() {
        "use strict";
       
        //My 2.0 pseudo code for peak / valley finding:
        // Easy: look for runs where slope is 30 degrees counterclockwise from prior run, then close off prior run and start new one.

        //3.0 look for angle, but also check for valleys and end there, instead.
        
        var _index = this.graphs.length-1;
        
        if (this.filled_graphs) this.remove_tidy_endpoints(this.graphs[_index].graph_data_obj);
        // var plateau_threshold = this.get_max_graph_affected(_index) / plateau_threshold;
        var _data = this.graphs[_index].graph_data_obj;
        var _data_length = _data.dataX.length;

        var threshold = this.days_threshold; //Minimum days to detect a valley / peak

        var bounding_box = this.board.getBoundingBox(); //returns 4 element array: 0-left, 1-upper, 2-right, 3-lower

        var _scale = (bounding_box[2] - bounding_box[0]) / (bounding_box[1] - bounding_box[3]); //normally rise/run, but since we're transforming data it's 1/(rise/run) anyway
    
        var angle_threshold = this.angle_threshold;
        angle_threshold = (angle_threshold * Math.PI/180) //convert to radians
        var run_reg = 0;
        // inform((angle_threshold * 180/Math.PI)/ _scale);
        // inform(_scale);

        var peaks_and_valleys = [];
        var run_start_x = 0;
        var peak_index = 0;

        var check_for_valley = function(__data, start_x, end_x) {
            "use strict";
            var valley = {x:0, y:Infinity};
            for (var i = start_x; i < end_x; i ++)
            {
                if (__data.dataY[i] <= valley.y) {
                    valley.x = i;
                    valley.y = __data.dataY[i];
                }
            }
            return valley;
        }

        // var avg_slope = 0;

        var find_peak = function(__data, start_x, end_x) {
            "use strict";
            var peak = {x:0, y:0};
            for (var i = start_x; i < end_x; i ++)
            {
                if (__data.dataY[i] >= peak.y) {
                    peak.x = i;
                    peak.y = __data.dataY[i];
                }
            }
            return peak;
        }
        for (var x = 0; x < _data_length; x++) {
            var current_y = _data.dataY[x];
            // threshold = (x > this.days_threshold) ? this.days_threshold : x;

            if (current_y > 0 && run_start_x == 0) { //Begin Runs
                run_start_x = x;
                if (x > threshold) x += threshold; // skip ahead
            }

            if (x - run_start_x >= threshold  || x == _data_length-1) {
                run_reg = this.do_linear_regression_graph(_index, x - threshold, x); // find slope of last (x - threshold) run
                var x2 = x;
                var x2_length = (x2 + this.predicted_days < _data_length) ? x2 + this.predicted_days : _data_length
                var projected_run_reg = this.do_linear_regression_graph(_index, x2, x2_length); // find slope of forward run
 
                // inform(projected_run.slope, run_reg.slope, angle_threshold);
                // inform(Math.atan(lin_reg.slope - run_slope.slope));
                if ((Math.atan(projected_run_reg.slope * _scale) - Math.atan(run_reg.slope * _scale)  >= angle_threshold) || x == _data_length-1) { //We're past 30 from prior slope, so close off that section, and start next one
                    // inform(Math.atan(projected_run.slope)*180/Math.PI, Math.atan(run_reg.slope)*180/Math.PI, -angle_threshold*180/Math.PI);
                    var valley = check_for_valley(_data, x2, x2_length);
                    x = valley.x;
                    peaks_and_valleys.push({})
                    inform(run_start_x);
                    peaks_and_valleys[peak_index].start = run_start_x;
                    // if (x == _data_length-1 || x == _data_length) peaks_and_valleys[peak_index].end = Infinity;
                    // else peaks_and_valleys[peak_index].end = x;
                    if (_data_length - x < this.crop || (this.crop == 0 && _data_length - x < 14)) { //if we're a (14 days) from the end just call it the last curve and break
                        peaks_and_valleys[peak_index].end = _data_length + this.prediction_length; //Could also set to Infinity;
                        peaks_and_valleys[peak_index].peak = find_peak(_data, run_start_x, peaks_and_valleys[peak_index].end);
                        // avg_slope = this.do_linear_regression_graph(_index, run_start_x, _data_length-this.crop);
                        break;
                    }
                    else {
                        peaks_and_valleys[peak_index].end = x;
                        peaks_and_valleys[peak_index].peak = find_peak(_data, run_start_x, x);
                        
                    // if (_data.dataY[peaks_and_valleys[peak_index].start] < _data.dataY[x]) peaks_and_valleys[peak_index].riser = current_y;
                    // else peaks_and_valleys[peak_index].riser = _data.dataY[peaks_and_valleys[peak_index].start];
                    
                        peak_index ++;
                        run_start_x = x;
                        var avg_slope = 0;
                        x = (x + threshold >= _data_length-1) ? x : x + threshold;
                    }

                }

            }

        }
      

        // if (!peaks_and_valleys[peak_index].peak_x) peaks_and_valleys.pop(); // If we don't have a peak for the last index remove the whole index
   

        inform(peaks_and_valleys);
        if (peak_index == 0) {
            alert("No curves found! Have you tried reducing or disabling moving day average?");
            if (this.filled_graphs) this.add_tidy_endpoints(this.graphs[_index].graph_data_obj);
            return;
        }


        // add three duplicates of last curve to show different scenarios (2x, 4x, and 10x top end):

        // var graph_color = this.graphs[this.graphs.length-1].graph_data_obj.getAttribute("strokeColor");
        // peaks_and_valleys.push({start: peaks_and_valleys[peak_index].start,
        //                         end:  peaks_and_valleys[peak_index].end,
        //                         multiplier: 2,
        //                         color: this.increase_brightness(graph_color, 20),// this.generated_curve_colors[2]
        //                         extra: 1
        // });

        // peaks_and_valleys.push({start: peaks_and_valleys[peak_index].start,
        //                         end:  peaks_and_valleys[peak_index].end,
        //                         multiplier: 4,
        //                         color: this.increase_brightness(graph_color, 40),
        //                         extra: 2
        // });

        // peaks_and_valleys.push({start: peaks_and_valleys[peak_index].start,
        //                         end:  peaks_and_valleys[peak_index].end,
        //                         multiplier: 10,
        //                         color: this.increase_brightness(graph_color, 60),
        //                         extra: 3
        // });

        peaks_and_valleys[peaks_and_valleys.length-1].last = true;
        inform(peaks_and_valleys);
        var Parms_collection = [];
        
        this.generated_curves = [];
        peaks_and_valleys.forEach(function(element, i) {
            inform("-------Curve " + (i+1));
            var ret_value = SPICY_COVID_NS.logistic_regression_with_decay(_index, element, i+1);
            for (var i = 0; i < ret_value.length; i++) {
                Parms_collection.push(Number(ret_value[i]));
            }
            // Parms_collection.push(ret_value.forEach(function(el){ return el;}));
        });

        this.logistic_regression_with_decay_one_curve(peaks_and_valleys, Parms_collection);

        if (this.filled_graphs) this.add_tidy_endpoints(this.graphs[_index].graph_data_obj);
        // var c3 = JXG.joinCurves(SPICY_COVID_NS.board, [SPICY_COVID_NS.generated_curves[0].curve, SPICY_COVID_NS.generated_curves[1].curve], 
        //     {   strokeColor:'black', 
        //         strokeWidth:3, 
        //         fillColor:'yellow', fillOpacity:0.2
        //     });

        
        return;

       
    },

    //Create a blank graph with dimensions defined by the first region's data (Alabama)
    initialize_graph: function() {
        "use strict";

        // this.regions_of_interest.pop();
        var context = this.get_context();

        var _parent_data = this.affected_data[context];
        this.fill_regions_dropdown(_parent_data.region_list);

        var _region_column = _parent_data.columns.region_column;
        var _data = this.affected_data[context].data;
        var temp_region = [];
        // push_region_obj(temp_region, context, this.affected_data[context].data, this.affected_data[context].data[0][this.affected_data[context].columns.affected_column]);
        this.create_region_of_interest(temp_region, _data[0][_region_column], context, true);

        this.max_date = temp_region[0].data.length;
        this.run = temp_region[0].data.length;

        var _affected_column = _parent_data.columns.affected_column;
        this.max_affected = this.get_max_base_affected(temp_region[0], _affected_column);
        this.max_affected.y = this.max_affected.y + this.max_affected.y / 8;
        inform (this.max_affected);

 

        JXG.Options.text.cssDefaultStyle = '';
        JXG.Options.text.highlightCssDefaultStyle = '';

        var new_browser_context = this.browser_context_template("desktop", 18, false, 14);
        Object.assign(this.browser_context_list, new_browser_context);

        new_browser_context = this.browser_context_template("mobile", 11, true, 10);
        Object.assign(this.browser_context_list, new_browser_context);

        this.viewport_width = $(window).width();
        this.viewport_height = $(window).height();
        inform(this.viewport_width);

        if (this.viewport_width < 768) this.browser_context = 'mobile';
        else this.browser_context = 'desktop';
        if (this.x_axis_style == 'dates') {
            this.alt_x_axis();
        }
        else {
            this.board = JXG.JSXGraph.initBoard('jsxbox', {
                boundingbox: [-50,this.max_affected.y,this.max_date+20,-.05],
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
        }
        
        this.add_axes();
        this.board.on('update', function (){ SPICY_COVID_NS.update_axes();});


        inform(this.board);

        // var x = [...Array(this.max_date).keys()];
        // var y = this.extract_affected(temp_region[0].data, temp_region[0].columns.affected_column);


     

        this.board.update();

        // this.board.on('update', this.update_axes());

        this.max_affected.y = 0; //reset so adding deaths doesn't show a large y-axis bounding box.
        // delete temp_region;
    },

    //Updates axes and arrows
    update_axes: function() {
        "use strict";
        //this.board.update();

        //AXES:
        var bounding_box = this.board.getBoundingBox(); //returns 4 element array: 0-left, 1-upper, 2-right, 3-lower

        if (this.x_axis_style != "dates") var factor = 3;
        else {

            var factor = 7;
            var threshold = this.viewport_width * .650054 + 220.758 // f(x) = .650(x) + 220

            if (bounding_box[2] - bounding_box[0] > threshold && !this.months_abbreviated) {
                // this.xaxis.ticks.setAttribute({label:{visible: false}});
                // this.abbv_xaxis.ticks.setAttribute({label:{visible: true}});
                this.xaxis.ticks.setAttribute({drawLabels: false});
                this.abbv_xaxis.ticks.setAttribute({drawLabels: true});
                
                this.months_abbreviated = true;
                // this.board.update();
            }
            else if (bounding_box[2] - bounding_box[0] <= threshold && this.months_abbreviated) {
                // this.xaxis.ticks.setAttribute({label:{visible: true}});
                // this.abbv_xaxis.ticks.setAttribute({label:{visible: false}});
                this.xaxis.ticks.setAttribute({drawLabels: true});
                this.abbv_xaxis.ticks.setAttribute({drawLabels: false});

                this.months_abbreviated = false;
                // this.board.update();
            }
            // inform(this.xaxis.ticks);
            
        }

        if (bounding_box[2] > Math.abs(bounding_box[0])) var x_offset = (bounding_box[2] / 2 );
        else var x_offset = bounding_box[0] /2
        var y_offset = -(bounding_box[1] -bounding_box[3]) / factor;

        this.axis.x_axis_obj.setPosition(JXG.COORDS_BY_USER, [x_offset,y_offset]);
    

        x_offset = -(bounding_box[2] - bounding_box[0]) / 30;
        if (bounding_box[1] > Math.abs(bounding_box[3])) y_offset = (bounding_box[1] / 10 );
        else {
            y_offset = bounding_box[3]
        }
    
        this.axis.y_axis_obj.setPosition(JXG.COORDS_BY_USER, [x_offset,y_offset]);

      
        this.board.fullUpdate();


    },


    add_axes: function() {
        "use strict";

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

    remove_graph: function(_region_name) {
        "use strict";
        var _context = this.get_context();
        for (var i = 0; i < this.graphs.length; i++) {
            if (this.graphs[i].graph_region_label_obj.plaintext.search(_region_name) != -1) {
                if (_context == this.graphs[i].context) {
                    this.board.removeObject(this.graphs[i].graph_arrow_obj);
                    this.board.removeObject(this.graphs[i].graph_region_label_obj);
                    this.board.removeObject(this.graphs[i].graph_data_obj);
                    this.graphs.splice(i, 1);
                    this.regions_of_interest.splice(i, 1);
                    return;
                }
            }
            
        }
    },

    clear_all: function(_reset_bounds) {
        "use strict";
        if (_reset_bounds) {
            this.max_affected.x = 0;
            this.max_affected.y = 0;
        }
        inform(this.board);
        for (var i = 0; i < this.graphs.length; i++) {
            this.board.removeObject(this.graphs[i].graph_arrow_obj);
            this.board.removeObject(this.graphs[i].graph_region_label_obj);
            this.board.removeObject(this.graphs[i].graph_data_obj);
            delete this.graphs[i];
            delete this.regions_of_interest[i];
        }

        //Doesn't appear to hurt, may help browser garbage collection:
        this.board.objectsList.forEach(element => SPICY_COVID_NS.board.removeObject(element));
        
        this.board.removeEventHandlers(); // Prevents ghost x axis events
        // JXG.JSXGraph.freeBoard(this.board); //errors on removing ticks
        this.graphs = [];
        this.regions_of_interest = [];
        // this.board.update();

    },

    //search graphs[] for duplicates by region name and context (filename)
    duplicate_graph_check: function(_region, _context) {
        "use strict";
        var src = _region;

        // if (_selected_region_parent_data[_index].context != _context) return false;

        for (var i = 0; i < this.graphs.length; i++) {
            // if (this.graphs[i].graph_region_label_obj.plaintext.search(src) != -1) { //bugs with virginia / west virigina and congo /dr of congo
            if (this.graphs[i].name == src) {
                // inform(this.graphs[i]);
                if (_context == this.graphs[i].context) return true;
                // inform (_context);
                // inform(this.graphs[i].context);
            }
        }
        return false;
    },

    //Calls constructor for graphs[] where each graph's information is stored (including JSXGraph's) typically used with regions_of_interest[]
    add_region_to_graph: function(_selected_region_parent_data, _index, _context) {
        "use strict";
  
        //most cases we will automate the index to the last index of the array
        if (_index == -1) _index = _selected_region_parent_data.length-1;
        var _selected_region = _selected_region_parent_data[_index];
        


        //Used for keeping track of the highest value for bounding box settings
        var header_factor = 8; // e.g. when set to 5 adds 20% to the top.
        var new_max_affected = this.get_max_base_affected(_selected_region, _selected_region.columns.affected_column);
        var peak = new_max_affected.y;
        var run = new_max_affected.x;
        var return_max_affected = new_max_affected;


        // new_max_affected.y = new_max_affected.y + new_max_affected.y / header_factor
        // var data_context = this.regions_of_interest[__selected_region]._region_obj
        if (new_max_affected.y > this.max_affected.y) this.max_affected.y = new_max_affected.y;
        if (new_max_affected.x > this.max_affected.x) this.max_affected.x = new_max_affected.x
    

        //numeric date
        this.max_date = this.max_date < _selected_region.data.length ? _selected_region.data.length : this.max_date;
        this.board.setBoundingBox([-20,this.max_affected.y,this.max_date * 2+20,-this.max_affected.y / 3]);
        this.board.update();

        var x = [...Array(_selected_region.data.length).keys()];
        var y = this.extract_affected(_selected_region.data, _selected_region.columns.affected_column);

        var my_color_index = _index % Object.keys(this.custom_colors).length;

        var my_color = this.custom_colors[my_color_index].value;
        var fill_color = this.filled_graphs ? my_color : 'none';
       

        var graph = this.board.create('curve', [x,y], {
            strokeColor:my_color,
            fillColor:fill_color, 
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
        // var label_context = this.interpret_context(_selected_region_parent_data[_index].context);
        var label_context = _selected_region_parent_data[_index].split_context.affected;

        // inform(this.interpret_context(_selected_region_parent_data[_index].context));
        // inform(_selected_region);
        // var region_txt = _selected_region.data[0][_selected_region.columns.region_column] + " (" + label_context.affected + ")";
        var region_txt = _selected_region.region + " (" + label_context + ")";


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

        // ****************Arrow/Line Label Object*******************
        var fill_offset = this.filled_graphs == true ? -1 : 0;
        var arrow_peak = [run+fill_offset,peak];
        
        var arrow_obj = this.board.create('line', 
            //point coords
            // [region_txt_obj, [arrow_peak[0], arrow_peak[1]]], {
            [[label.x, label.y], [arrow_peak[0], arrow_peak[1]]], {
            straightFirst:false, straightLast:false,
            strokeWidth:2, dash:1,
            fixed: true,
            strokeColor: my_color,
            strokeOpacity: .5
            });


        region_txt_obj.on('move', function(){
            // var point = this.coords.usrCoords;
            // var bounding_box = SPICY_COVID_NS.board.getBoundingBox();
            // var vert_scale = bounding_box[1] - bounding_box[3];
            // point[2] = point[2] + (SPICY_COVID_NS.browser_context_list[SPICY_COVID_NS.browser_context].graph_region_font_size  * (this.content.split(" ").length - 1))/ vert_scale;
            // arrow_obj.point1.setPosition(JXG.COORDS_BY_USER, point);
            arrow_obj.point1.setPosition(JXG.COORDS_BY_USER, this.coords.usrCoords);
            // console.log(this);
        });
     

        // board.on('update', function(){console.log('updated', point.X(), point.Y())});

        var construct = new this.graph_status_obj(_selected_region.region, region_txt_obj, graph, arrow_obj, -1, my_color, arrow_peak, _context, return_max_affected); // set rolling avg to -1 so its updated later at update_rolling_average()
 

        var graph_index = this.graphs.length; //since we check it before the push() it will equal current .length
        this.graphs.push(construct);
        
        if (this.filled_graphs) this.add_tidy_endpoints(this.graphs[graph_index].graph_data_obj);


        if (this.rolling_day_average_enabled) {
            
            this.update_rolling_average(_selected_region_parent_data);
            // this.clip_bounding_box_by_graph();
            // this.arrange_region_labels(-1);
            
        }
        else 
            this.update(); //required to update graph's new curve

        return return_max_affected;

    },

    arrange_region_labels: function() {
        "use strict";
        var _graph_max_affected = [];
        
        var _box = this.board.getBoundingBox(); //returns 4 element array: left, upper, right, lower
        var _vert_space = _box[1];
        //Get values

        // inform(this.ranking);
        var highest_affected = {x:0, y:0, total:0, index:0};
        for (var i = 0; i < this.graphs.length; i++) {
        
            // if (_graph_max_affected[i].y > highest_affected) highest_affected = _graph_max_affected
            _graph_max_affected.push(this.get_max_graph_affected(i));
            
            if (this.ranking == "Total") {
                //we use temp variable here because we only want the total from the regions list, the peaks we want from the graphs.
                var _temp_max_affected = this.get_max_base_affected(this.regions_of_interest[i], this.regions_of_interest[i].columns.affected_column);
                // inform(_temp_max_affected);
                _temp_max_affected.x = _graph_max_affected[i].x //not sure we need x & y here
                _temp_max_affected.y = _graph_max_affected[i].y
                highest_affected = _temp_max_affected.total > highest_affected.total ? _temp_max_affected : highest_affected;
                _graph_max_affected[i].total = _temp_max_affected.total;
            }
            else if (this.ranking == "Peak") highest_affected = _graph_max_affected[i].y > highest_affected.y ? _graph_max_affected[i] : highest_affected;
            else {
                _graph_max_affected[i].linreg = this.do_linear_regression(i, this.days);
            }
            
            _graph_max_affected[i].index = i;
        }
        // inform(_graph_max_affected);
        if (this.ranking == "Total") {
            _graph_max_affected.sort(function(a, b) {return b.total - a.total;}); //sort by descending
        }
        else if (this.ranking == "Peak") _graph_max_affected.sort(function(a, b) {return b.y - a.y;}); //sort by descending
        else if (this.ranking == "Slope") _graph_max_affected.sort(function(a, b) {return b.linreg.slope - a.linreg.slope;}); //sort by descending
        // inform(_graph_max_affected);

        //Translate / arrange on graph canvas
        var bounds = this.board.getBoundingBox(); //returns 4 element array: 0-left, 1-upper, 2-right, 3-lower
        var left = bounds[0] + 100;
        // var width = bounds[2] - bound[0];
        if (bounds[2] > this.run + this.run * .25) {//If we're scrolled far enough right lets start at the far right
            left = this.run - 100;
        }
        // else if (bounds[2] > 0) { //If we're scrolled far enough right lets 'center' around peak
        //     left = highest_affected.x - 100;
        // }
        // else left = 100;  //Otherwise let's align to the right of the y axis
        var vert_percent = 75;
        var row_size = 4; // number of labels in each column
        _vert_space = _vert_space * (vert_percent / 100);
        var column_size = -.0787402*this.viewport_width + 283; // space between columns = f(x) = 0.078(x) + 283
        var min = _vert_space / (row_size * 2); //buffer between x axis and labels

        //distribute labels in rows / columns
        for (var i = 0; i < this.graphs.length; i++) {
            var i2 = i+1;

            var x = left;
            var y = _vert_space  - (_vert_space / row_size * i);

            while (y < min) { // move over to another column.
                y += _vert_space;
                x += column_size;
            }
            
            y += min;

            var _index = _graph_max_affected[i].index;
            var _region_label_obj = this.graphs[_index].graph_region_label_obj;
            
            //Remove numbering if already present
            var find_result = _region_label_obj.plaintext.lastIndexOf('.');
            if (find_result != -1) {
                _region_label_obj.plaintext = _region_label_obj.plaintext.slice(find_result+1, _region_label_obj.plaintext.length);
            }
            _region_label_obj.setText(i2 + '. ' + _region_label_obj.plaintext);// + _graph_max_affected[i].total);

            _region_label_obj.setPosition(JXG.COORDS_BY_USER, [x,y]); //update text label position
            this.graphs[_index].graph_arrow_obj.point1.setPosition(JXG.COORDS_BY_USER, _region_label_obj.coords.usrCoords); //update arrow position
        }
        this.board.update();
    },
    
    //Clip by active graph data potentially put through rolling average / other transformations versus underlying actual data.
    clip_bounding_box_by_graph: function() {
        "use strict";
        var _max_y = 0;
        if (this.graphs.length == 0) return;
        for (var i = 0; i <this.graphs.length; i++) {
            for (var i2 = 0; i2 < this.graphs[i].graph_data_obj.dataY.length; i2++) {
                if (this.graphs[i].graph_data_obj.dataY[i2] > _max_y) {
                    _max_y = this.graphs[i].graph_data_obj.dataY[i2];
                    // var last_obj = this.graphs[i].graph_data_obj;
                }
            }
        }

        this.board.setBoundingBox([-20,_max_y + _max_y / 8, this.max_date+20,-_max_y / 3]);
    },

    remove_top_regions: function(_num_regions, _num_days, _style){
        "use strict";

        if (this.run < 1) this.run = 1;

        if (_num_days > this.run) _num_days = this.run;
        else if (_num_days < 1) _num_days = 1;
        if (_num_regions > this.graphs.length) _num_regions = this.graphs.length;
        else if (_num_regions < 1) _num_regions = 1;

        var _graphs_list = []; //checklist of graphs to be removed
        for (var i = 0; i < this.regions_of_interest.length; i++) {
            var _total = 0;
            // var _context = this.interpret_context(this.regions_of_interest[i].context);
            if (_style == "Fastest Rising") {
                var _linreg = this.do_linear_regression_graph(i, this.days);
                _graphs_list.push({linreg: _linreg, index: i});
            }
            else {
                var _context = this.regions_of_interest[i].columns.affected_column;
                for (var days_counter = this.run - _num_days; days_counter < this.run; days_counter++)
                {
                    _total += this.regions_of_interest[i].data[days_counter][_context];
                }
                _graphs_list.push({total: _total, index: i});
            }
        }

        if (_style == "Fastest Rising") _graphs_list.sort(function(a, b) {return b.linreg.slope - a.linreg.slope;});
        else _graphs_list.sort(function(a, b) {return b.total - a.total;}); //sort by descending total
        _graphs_list.splice(_num_regions, _graphs_list.length - _num_regions); //remove bottom regions from checklist
        _graphs_list.sort(function(a, b) {return b.index - a.index;}); //sort by descending index to prevent reindex problems with splice below

        inform(_graphs_list);
        // inform(this.graphs);
        // inform(this.regions_of_interest);

        for (var i = 0; i < _graphs_list.length; i++) {
            var index = _graphs_list[i].index;
            this.board.removeObject(this.graphs[index].graph_arrow_obj);
            this.board.removeObject(this.graphs[index].graph_region_label_obj);
            this.board.removeObject(this.graphs[index].graph_data_obj);
            this.graphs.splice(index, 1);
            this.regions_of_interest.splice(index, 1);

        }

        // inform(this.graphs);
        // inform(this.regions_of_interest);


        
        this.arrange_region_labels();
        
    },

    find_my_index: function(_region, _context) {
        "use strict";
        for (var i = 0; i < this.regions_of_interest.length; i++) {
            if (this.regions_of_interest[i].region == _region && this.regions_of_interest[i].context == _context) return i;
        }
    },

    recalculate_peaks_totals: function(){
        "use strict";
        for (var i = 0; i < this.graphs.length; i++) {

            data = this.get_max_base_affected(this.regions_of_interest[i], this.regions_of_interest[i].split_context.affected);
            this.graphs[i].max.total = data.total;

            var data = get_max_graph_affected(i);
            this.graphs[i].max.y = data.y;
            this.graphs[i].max.y = data.x;

        }
    },

    do_linear_regression: function(index, _num_days) {
        "use strict";

        var _lin_reg_sumx = 0;
        var _lin_reg_sumx2 = 0;
        var _lin_reg_sumy = 0;
        var _lin_reg_sumxy = 0;
        var ret_value = {slope: 0, intercept: 0};
        var run_length = _num_days;

        var _context = this.regions_of_interest[index].columns.affected_column;
        // var _length = this.regions_of_interest[index].data.length
        var _length = this.run;
        var _start = _length - _num_days;
        

          for (var i = _start; i < _length; i++) {
            var _data_var = this.regions_of_interest[index].data[i][_context]

            _lin_reg_sumx = _lin_reg_sumx + i;
            _lin_reg_sumx2 = _lin_reg_sumx2 + i * i;
            _lin_reg_sumy = _lin_reg_sumy + _data_var;
            _lin_reg_sumxy = _lin_reg_sumxy + i * _data_var;
            
          }
          if (_lin_reg_sumx2 - _lin_reg_sumx * _lin_reg_sumx == 0) return ret_value; //avoid divide by 0
          ret_value.slope = (run_length * _lin_reg_sumxy - _lin_reg_sumx * _lin_reg_sumy) / (run_length * _lin_reg_sumx2 - _lin_reg_sumx * _lin_reg_sumx)
          ret_value.intercept = (_lin_reg_sumy - ret_value.slope * _lin_reg_sumx) / run_length
          return ret_value;
    },

    do_linear_regression_graph: function(index, _start, _end) {
        "use strict";

        var _lin_reg_sumx = 0;
        var _lin_reg_sumx2 = 0;
        var _lin_reg_sumy = 0;
        var _lin_reg_sumxy = 0;
        var ret_value = {slope: 0, intercept: 0};
        _start = Math.floor(_start);
        _end = Math.floor(_end);

        if (_start < 0) _start = 0;
        if (_end > this.graphs[index].graph_data_obj.dataY.length) _end = this.graphs[index].graph_data_obj.dataY.length;
        if (_start == _end || _start > _end) return ret_value;
        var run_length = _end - _start;
        // var _length = this.regions_of_interest[index].data.length
        // var _start = _length - _num_days;
        

          for (var i = _start; i < _end; i++) {
            var _data_var = this.graphs[index].graph_data_obj.dataY[i];
            _lin_reg_sumx = _lin_reg_sumx + i;
            _lin_reg_sumx2 = _lin_reg_sumx2 + i * i;
            _lin_reg_sumy = _lin_reg_sumy + _data_var;
            _lin_reg_sumxy = _lin_reg_sumxy + i * _data_var;
            
          }
          if (_lin_reg_sumx2 - _lin_reg_sumx * _lin_reg_sumx == 0) return ret_value; //avoid divide by 0
          ret_value.slope = (run_length * _lin_reg_sumxy - _lin_reg_sumx * _lin_reg_sumy) / (run_length * _lin_reg_sumx2 - _lin_reg_sumx * _lin_reg_sumx)
          ret_value.intercept = (_lin_reg_sumy - ret_value.slope * _lin_reg_sumx) / run_length
          return ret_value;
    },

    add_top_regions: function(_num_regions, _num_days, _style){
        "use strict";
        var _context = this.get_context();
        var _region_list = [];
        var _prev_region = "";
        var _check_region = "";
        var _affected_column = this.affected_data[_context].columns.affected_column;
        var _region_name_column = this.affected_data[_context].columns.region_column;
        var _data = this.affected_data[_context].data;
        var _total = 0;

        var _lin_reg_sumx = 0;
        var _lin_reg_sumx2 = 0;
        var _lin_reg_sumy = 0;
        var _lin_reg_sumxy = 0;
        var _y_intercept = 0;
         
        if (this.run < 1) this.run = 1;

        if (_num_days > this.run) _num_days = this.run;
        else if (_num_days < 1) _num_days = 1;
        if (_num_regions > this.affected_data[this.get_context()].region_list.length) _num_regions = this.affected_data[this.get_context()].region_list.length;
        else if (_num_regions < 1) _num_regions = 1;

        var run_length = _num_days;
        var start = this.run - _num_days;
        var new_region = true;
        var section_offset = 0;

        for (var i = start; i < _data.length; i++) {
 
            _check_region = _data[i][_region_name_column];

            if (new_region) {
                _prev_region = _check_region;
                new_region = false;
            }

            //Sum region totals:
            if (_check_region == _prev_region) {
                if (_style == "Fastest Rising") {
                    var i2 = i - (section_offset * this.run) + 1;
                    var _data_var = _data[i][_affected_column];
                    _lin_reg_sumx = _lin_reg_sumx + i2;
                    _lin_reg_sumx2 = _lin_reg_sumx2 + i2 * i2;
                    _lin_reg_sumy = _lin_reg_sumy + _data_var;
                    _lin_reg_sumxy = _lin_reg_sumxy + i2 * _data_var;
                }
                _total += _data[i][_affected_column];
            }
            else {
                var _slope = (run_length * _lin_reg_sumxy - _lin_reg_sumx * _lin_reg_sumy) / (run_length * _lin_reg_sumx2 - _lin_reg_sumx * _lin_reg_sumx)
                _y_intercept = (_lin_reg_sumy - _slope * _lin_reg_sumx) / run_length
                _region_list.push({ region:_data[i-1][_region_name_column],
                                    total:_total,
                                    slope: _slope,
                                    y_intercept: _y_intercept
                                });
                _total = 0;

                _lin_reg_sumx = 0;
                _lin_reg_sumx2 = 0;
                _lin_reg_sumy = 0;
                _lin_reg_sumxy = 0;
                

                i += start-1; //skip ahead by days 
                new_region = true;
                section_offset ++;
            }
 
            _prev_region = _check_region;
        }
        
        //Last region in list (e.g. Wyoming) (confirmed 11/23/2020)
        _region_list.push({ region: _data[_data.length-1][_region_name_column],
                            total: _total,
                            slope: _slope,
                            y_intercept: _y_intercept
                        });
        if (_style == "Fastest Rising") _region_list.sort(function(a, b) {return b.slope - a.slope;}); //sort by descending slope
        else _region_list.sort(function(a, b) {return b.total - a.total;}); //sort by descending total

        var _full_list = _region_list;
        _region_list = _region_list.slice(0, _num_regions);
        // inform(_full_list, _region_list);

        for (var i = 0; i < _region_list.length; i++) {
            var try_region = this.create_region_of_interest(this.regions_of_interest, _region_list[i].region, _context, false);
            if (try_region != -1) {
                this.add_region_to_graph(this.regions_of_interest, -1, _context);
            }
        }


        this.arrange_region_labels();
        
        //Log full list to textarea
        var context_str = new this.header_obj(_context);


        if (_style == "Fastest Rising") var str = "Across last " + _num_days + " days:\n" + "List of fastest rising regions sorted by linear regression slope for (" + context_str.affected_column + ")\n\n";
        else var str = "Across last " + _num_days + " days:\n" + "List of region totals as % of respective state/country total population sorted by (" + context_str.affected_column + ")\n\n";

        for (var i = 0; i < _full_list.length; i++) {
            // if (_style == "Fastest Rising") str = str + (i + 1) + '. ' + _full_list[i].region + ': y = (' + Number.parseFloat(_full_list[i].slope).toPrecision(5) +')x + ' + Number.parseFloat(_full_list[i].y_intercept).toPrecision(5) + '\n';
            if (_style == "Fastest Rising") str = str + (i + 1) + '. ' + _full_list[i].region + ' ' + this.number_to_string(Number.parseFloat(_full_list[i].slope).toPrecision(12)) + '\n';
            else str = str + (i + 1) + '. ' + _full_list[i].region + ' ' + number_to_string(Number.parseFloat(_full_list[i].total).toPrecision(12)) + '%\n';
        }

        var divider_str = "\n*****************************\n\n*****************************\n";
        $('#console').val(str + divider_str + $('#console').val());

        // inform(this.graphs);
        return _region_list;
    },

    
    update_region_label: function(index) {
        "use strict";
        var _selected_graph_region = this.graphs[index];
        var max_affected = this.get_max_graph_affected(index);
        _selected_graph_region.graph_region_label_obj.setCoords(max_affected.x,max_affected.y);
        
    },

    update_arrow_peak: function(index) {
        "use strict";
        var _selected_graph_region = this.graphs[index];
        var max_affected = this.get_max_graph_affected(index);
        var fill_offset = this.filled_graphs == true ? -1 : 0;                               
        _selected_graph_region.graph_arrow_obj.point2.setPosition(JXG.COORDS_BY_USER, [max_affected.x+fill_offset, max_affected.y]);
        
    },

    //Actual rolling average to data algo
    transform_range: function(data, breadth) {
        "use strict";
        var range = [];
        var parent_result_array = []

        //Inline function to account for rangle limitations at beginning and end of array
        function average_across_range(data, x, breadth) {
            breadth = Math.floor(breadth / 2);
            var start = x - breadth;
            var end = x + breadth;
            
            if (start < 0) { 
                var x_left_divisor = x;
                start = 0;
            }
            else x_left_divisor = breadth

            if (end > data.length) {
                var x_right_divisor = data.length - x;
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
        "use strict";
            // if (this.filled_graphs) this.remove_tidy_endpoints(this.graphs[index].graph_data_obj)
            this.graphs[index].graph_data_obj.dataX = [...Array(_data.data.length).keys()];
            this.graphs[index].graph_data_obj.dataY = this.extract_affected(_data.data, _data.columns.affected_column); //we need to extract data before next line
            this.graphs[index].graph_data_obj.dataY = this.transform_range(this.graphs[index].graph_data_obj.dataY, this.rolling_day_value);
            if (this.filled_graphs) this.add_tidy_endpoints(this.graphs[index].graph_data_obj);
    },

    //Return affected people (deaths or cases data) 
    extract_affected: function(data, column) {
        "use strict";
        var y = [];

        for (var i = 0; i < data.length; i++) {
            y.push(data[i][column]);
        }
        return y;
    },

    //Globally updates rolling average changes after a change
    update_rolling_average: function(_data, changed) {
        "use strict";
        
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

                    this.graphs[i].graph_data_obj.dataX = [...Array(this.graphs[i].graph_data_obj.dataX.length).keys()];
                    this.graphs[i].graph_data_obj.dataY = this.extract_affected(this.regions_of_interest[i].data, this.regions_of_interest[i].columns.affected_column);
                    if (this.filled_graphs) this.add_tidy_endpoints(this.graphs[i].graph_data_obj);
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
        "use strict";
        // if (this.x_axis_style != 'dates')
        this.update_axes();
        this.board.update();
    },

    //This function is just to make the fillcolor look correct/good
    add_tidy_endpoints: function(graph) {
        "use strict";
        if (!this.filled_graphs) return; //If checkbox unchecked return
        graph.dataX.splice(0, 0, 0); //insert 0 at start of array
        graph.dataX.push(graph.dataX.length-1); //append a duplicate x value at the end of our data 

        graph.dataY.splice(0, 0, 0); 
        graph.dataY.push(0);
        // inform(graph.dataY);
        // return graph;       
    },

    //This function is to remove the added tidy points
    remove_tidy_endpoints: function(graph) {
        "use strict";
        if (!this.filled_graphs) return; 
        graph.dataX.splice(graph.dataX.length-1,1); //DO NOT CHANGE THIS TO .length-1 !!
        graph.dataX.splice(0,1);

        
        // inform(graph.dataY);
        graph.dataY.splice(graph.dataY.length-1,1); //DO NOT CHANGE THIS TO .length-1 !!
        graph.dataY.splice(0,1);

        // inform(graph.dataY);
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
   create_region_of_interest: function(_parent_array, _region, context, ignore_duplicates) {
    "use strict";

    // var context = this.get_context();
    var _parent_data = this.affected_data[context];
    // this.fill_regions_dropdown(_parent_data.region_list);
    var _region_column = _parent_data.columns.region_column;
    var _affected_column = _parent_data.columns.affected_column;
    var _data = this.affected_data[context].data;
    
    var data_buffer = [];


    var _check_region = "";
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
        // if ("region" in _parent_array[0]) { //check if region key exists in our target array
        // if (Array.isArray(_parent_array)) {
            if (_parent_array.length > 0) {

            if (!ignore_duplicates && this.duplicate_graph_check(_region, context)) {
                inform('duplicate found:', _region);
                return -1;
            }
        }

        
        data_buffer.push(_data[i]);
    
    }

    this.push_region_obj(_parent_array, context, data_buffer, _region);

    return;
   },
   
    
    get_max_base_affected: function(_dataset, column_name) {
        "use strict";

        var result_point = new this.point(0, 0);
        

        var _data = _dataset;
        var _total = 0;

        // for (var i = 0; i < _data.data.length; i++) {
        for (var i = 0; i < this.run; i++) {

            if (_data.data[i][column_name] > result_point.y){
                result_point.x = i;
                result_point.y = _data.data[i][column_name];
            }

            if (i >= _data.data.length - this.days) _total += _data.data[i][column_name];
            
        }
        result_point.total = _total; //add .total to our return value
        return result_point;
        //return this.regions_of_interest[_dataset_index].reduce((max, p) => p[column_name] > max ? p[column_name] : max, this.regions_of_interest[_dataset_index][column_name]);
    },

    get_max_graph_affected: function(index) {
        "use strict";
          var result_point = new this.point(0, 0);
        //   _total = 0; //Dont need totals of graph data with rolling avg applied

          for (var i = 0; i < this.graphs[index].graph_data_obj.dataX.length; i++) {
              if (this.graphs[index].graph_data_obj.dataY[i] > result_point.y){
                  result_point.x = i;
                  result_point.y = this.graphs[index].graph_data_obj.dataY[i];
                //   if (i > this.graphs[index].graph_data_obj.dataX.length - this.days) _total += result.point.y;
              }
          }
        //   result_point.total = _total;
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
        this.add_top_regions.parent = this;
        this.clear_all.parent = this;
        this.clip_bounding_box_by_graph.parent = this;
        this.push_region_obj.parent = this;
        this.update_arrow_peak.parent = this;
        this.arrange_region_labels.parent = this;
        this.duplicate_graph_check.parent = this;
        this.alt_x_axis.parent = this;
        this.remove_top_regions.parent = this;
        this.find_my_index.parent = this;
        this.recalculate_peaks_totals.parent = this;
        this.do_linear_regression.parent = this;
        this.remove_graph.parent = this;
        this.graph_status_obj.parent = this;
        this.generate_curves.parent = this;
        this.logistic_regression_with_decay.parent = this;
        this.func_base.parent = this;
        this.number_to_string.parent = this;

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
    SPICY_COVID_NS.rolling_day_average_enabled = document.getElementById('sevendayavg').checked
    SPICY_COVID_NS.filled_graphs = document.getElementById('filled_graphs_checkbox').checked
    SPICY_COVID_NS.rolling_day_value = $('#rolling_days').val();
    SPICY_COVID_NS.days = $('#top_regions_days').val();
    SPICY_COVID_NS.ranking = $( "#ranking_dropdown option:selected" ).text();

    //Radio button status get:
    if ($("#region_context_us").is(":checked") == true) { //<- needs tidying up
        SPICY_COVID_NS.region_context = "US";
    }
    else {
        SPICY_COVID_NS.region_context = "Global";
    }

    if ($("#affected_context_cases").is(":checked") == true) {

        SPICY_COVID_NS.affected_context = "Cases";
    }
    else {
        SPICY_COVID_NS.affected_context = "Deaths";
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
                SPICY_COVID_NS.process_data("", $.csv.toObjects(data));
                SPICY_COVID_NS.initialize_graph();
                
            }
            });
    }
    else {
        SPICY_COVID_NS.process_data("covid19_deaths_US_rate", covid19_deaths_US_rate);
        SPICY_COVID_NS.process_data("covid19_confirmed_US_rate", covid19_confirmed_US_rate);
        SPICY_COVID_NS.process_data("covid19_deaths_global_rate", covid19_deaths_global_rate);
        SPICY_COVID_NS.process_data("covid19_confirmed_global_rate", covid19_confirmed_global_rate);
        SPICY_COVID_NS.process_data("spanish_flu_conversion", spanish_flu_conversion);

        SPICY_COVID_NS.set_context("US", "Cases");
        SPICY_COVID_NS.initialize_graph();
        inform(SPICY_COVID_NS.affected_data["covid19_deaths_US_rate"]);
        var _context = "covid19_deaths_US_rate"
        var _parent_data = SPICY_COVID_NS.affected_data[_context];
        SPICY_COVID_NS.last_updated_date = _parent_data.data[_parent_data.data.length-1][_parent_data.columns.date_column];
        // location.reload(true);
        var current_date = new Date();
        var yesterday = new Date(current_date.getTime() - 1000*60*60*24);
        var data_date = new Date(SPICY_COVID_NS.last_updated_date);
        if (yesterday.getMonth() != data_date.getMonth() || yesterday.getDate() != data_date.getDate()) {
            alert("The data appears to be older than yesterday, perhaps server data has not been updated, yet!");
            // var return_val = window.confirm("The data appears to be older than one day, attempt reload? *Note this may be because I have not updated the datafiles, yet.")
            // if (return_val) location.reload(true);
        }
            
        
        // $('#last_updated').after(SPICY_COVID_NS.last_updated_date)
        var span_start = "<span class=\"small-text-border\">";
        var span_end = "</span>";
        $('#last_updated').append(span_start + SPICY_COVID_NS.last_updated_date + span_end + ", Number of Days since 1/22/20: " + span_start + SPICY_COVID_NS.max_date + span_end);
    }

    //Event handler for region radio buttons (US/Global)
    $('input[type=radio][name=region_context]').change(function () {
        "use strict";
        // SPICY_COVID_NS.region_context = $("#region_context input[type='radio']:checked").val();
        SPICY_COVID_NS.region_context = this.value;
        inform(SPICY_COVID_NS.region_context + " is now selected.");
        $('#regions_dropdown').empty();
        SPICY_COVID_NS.fill_regions_dropdown("-- Select --");
        SPICY_COVID_NS.fill_regions_dropdown(SPICY_COVID_NS.affected_data[SPICY_COVID_NS.get_context()].region_list);
    });

    //Event handler for 'affected' radio buttons (cases/deaths)
    $('input[type=radio][name=affected_context]').change(function () {
        "use strict";
        SPICY_COVID_NS.affected_context = this.value;
        inform(SPICY_COVID_NS.affected_context + " is now selected.");
        $("#regions_dropdown").val("-- Select --");
    });


    //Event handler for Region dropdown
    $('#regions_dropdown').change(function () {
        "use strict";
        var highlighted = $( "#regions_dropdown option:selected" ).text();
        inform(highlighted);
        if (highlighted == "-- Select --" || highlighted === undefined ) return;
        var _context =  SPICY_COVID_NS.get_context();
        var try_region = SPICY_COVID_NS.create_region_of_interest(SPICY_COVID_NS.regions_of_interest, highlighted, _context, false);
        if (try_region != -1) {
            // inform(SPICY_COVID_NS.regions_of_interest);
            SPICY_COVID_NS.add_region_to_graph(SPICY_COVID_NS.regions_of_interest, -1, _context);
        }
    });
    
    //Event handler for ranking dropdown Peak / Total / Slope change 
    $('#ranking_dropdown').change(function () {
        "use strict";
        var highlighted = $( "#ranking_dropdown option:selected" ).text();
        // inform(highlighted);
        // if (highlighted > SPICY_COVID_NS.max_date) highlighted = SPICY_COVID_NS.max_date;
        // else if (highlighted < 1) highlighted = 1;
        SPICY_COVID_NS.ranking = highlighted;
    });

    $('#slope_dropdown').change(function () {
        "use strict";
        var highlighted = $( "#ranking_dropdown option:selected" ).text();
        // inform(highlighted);
        // if (highlighted > SPICY_COVID_NS.max_date) highlighted = SPICY_COVID_NS.max_date;
        // else if (highlighted < 1) highlighted = 1;
        SPICY_COVID_NS.ranking = highlighted;
    });

    //Event handler for Rolling Average Checkbox
    $('#sevendayavg').change(function () {
        "use strict";
        if ($(this).is(':checked')) {
            inform($(this).val() + ' is now checked');
            SPICY_COVID_NS.rolling_day_average_enabled = true;
            SPICY_COVID_NS.update_rolling_average(SPICY_COVID_NS.regions_of_interest, true);
        } else {
            inform($(this).val() + ' is now unchecked');
            SPICY_COVID_NS.rolling_day_average_enabled = false;
            SPICY_COVID_NS.update_rolling_average(SPICY_COVID_NS.regions_of_interest, true);
        }
    }); 
    
    //Event handler for filled graphs checkbox
    $('#filled_graphs_checkbox').change(function () {
        "use strict";
        if ($(this).is(':checked')) {
            inform($(this).val() + ' is now checked');
            SPICY_COVID_NS.filled_graphs = true;
            // SPICY_COVID_NS.update_rolling_average(SPICY_COVID_NS.regions_of_interest, true);
            redo_graphs();
            SPICY_COVID_NS.arrange_region_labels();
            // SPICY_COVID_NS.update();
        } else {
            inform($(this).val() + ' is now unchecked');
            SPICY_COVID_NS.filled_graphs = false;
            // SPICY_COVID_NS.update_rolling_average(SPICY_COVID_NS.regions_of_interest, true);
            redo_graphs();
            SPICY_COVID_NS.arrange_region_labels();
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

    
    //Pure javascript to synchronize slope dropdown to arrange dropdowns
    var slope_selection = document.getElementById('slope_dropdown');
    var arrange_selection = document.getElementById('ranking_dropdown');
    
    slope_selection.addEventListener('input', function (val) {
        "use strict";
        var _val = val.target.value;
        if (_val == "Highest") arrange_selection.value = "Total";
        else if (_val == "Fastest Rising") arrange_selection.value = "Slope";
    });
    // arrange_selection.addEventListener('input', function (val) {
    //     slope_selection.value = val.target.value;
    // });
     

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
        var prior_context = {region: SPICY_COVID_NS.region_context, affected: SPICY_COVID_NS.affected_context}
        //= SPICY_COVID_NS.interpret_context(SPICY_COVID_NS.get_context());
        inform (prior_context);
        SPICY_COVID_NS.set_context("Global", "Deaths");
        var try_region = SPICY_COVID_NS.create_region_of_interest(SPICY_COVID_NS.regions_of_interest, "United Kingdom Spanish Flu 1918", SPICY_COVID_NS.uk_spanish_flu_deaths, false);
        if (try_region != -1) {
            SPICY_COVID_NS.add_region_to_graph(SPICY_COVID_NS.regions_of_interest, -1, SPICY_COVID_NS.uk_spanish_flu_deaths);
        }
        SPICY_COVID_NS.set_context(prior_context.region, prior_context.affected);

        // SPICY_COVID_NS.clip_bounding_box_by_graph(); 
        // SPICY_COVID_NS.arrange_region_labels(-1);
        // Update regions dropdown:
        $('#regions_dropdown').empty();
        SPICY_COVID_NS.fill_regions_dropdown("-- Select --");
        SPICY_COVID_NS.fill_regions_dropdown(SPICY_COVID_NS.affected_data[SPICY_COVID_NS.get_context()].region_list);
    });

    //Event handler for when days changes
    $('#top_regions_days').change(function() {
        SPICY_COVID_NS.days = $('#top_regions_days').val();
    });
    

    //Event handler for region hide button
    $('#hide_button').click(function() {
        "use strict";
        SPICY_COVID_NS.remove_graph($( "#regions_dropdown option:selected" ).text());
        // SPICY_COVID_NS.clip_bounding_box_by_graph(); 
        SPICY_COVID_NS.arrange_region_labels();
        $('#regions_dropdown').empty();
        SPICY_COVID_NS.fill_regions_dropdown("-- Select --");
        SPICY_COVID_NS.fill_regions_dropdown(SPICY_COVID_NS.affected_data[SPICY_COVID_NS.get_context()].region_list);
    });


    //Event handler for top regions add button
    $('#add_top_regions_button').click(function() {
        "use strict";
        SPICY_COVID_NS.add_top_regions($('#top_regions').val(), $('#top_regions_days').val(),$( "#slope_dropdown option:selected" ).text());
        // SPICY_COVID_NS.clip_bounding_box_by_graph(); 
        // SPICY_COVID_NS.arrange_region_labels();
    });

    //Event handler for top regions remove button
    $('#remove_top_regions_button').click(function() {
        "use strict";
        SPICY_COVID_NS.remove_top_regions($('#top_regions').val(), $('#top_regions_days').val(), $( "#slope_dropdown option:selected" ).text());
        // SPICY_COVID_NS.clip_bounding_box_by_graph(); 
        // SPICY_COVID_NS.arrange_region_labels(-1);
    });

    //Event handler for reframe (both) button
    $('#reframe_button').click(function() {
        SPICY_COVID_NS.clip_bounding_box_by_graph(); 
        SPICY_COVID_NS.arrange_region_labels();
    });

    
    //Event handler for clear button
    $('#clear_button').click(function() {
        "use strict";
        SPICY_COVID_NS.clear_all(true);
        SPICY_COVID_NS.initialize_graph(); //browser context is changed in function <-

        $('#regions_dropdown').empty();
        SPICY_COVID_NS.fill_regions_dropdown("-- Select --");
        SPICY_COVID_NS.fill_regions_dropdown(SPICY_COVID_NS.affected_data[SPICY_COVID_NS.get_context()].region_list);
    });

    //Event handler for arrange button
    $('#arrange_button').click(function() {
        "use strict";
        SPICY_COVID_NS.arrange_region_labels();
    });
    
     //Event handler for clip bounding box
     $('#gen_curves').click(function() {
        "use strict";
        SPICY_COVID_NS.generate_curves2(); 
    });

    //Event handler for clip bounding box
    $('#clip_bound_button').click(function() {
        "use strict";
        SPICY_COVID_NS.clip_bounding_box_by_graph(); 
    });

    //Event for window size change:
    $( window ).resize(function() {
        "use strict";
        // var window_size = $(window).innerWidth;
        var window_size = document.body.clientWidth;;
        // inform(window_size);
        waitForFinalEvent(function(){
            if (Math.abs(window_size - SPICY_COVID_NS.viewport_width) < 50) {

                SPICY_COVID_NS.hold_resize = false;
                return;
            }
            // inform(window_size, SPICY_COVID_NS.viewport_width);
            if (SPICY_COVID_NS.hold_resize) return;
            SPICY_COVID_NS.hold_resize = true;

            SPICY_COVID_NS.viewport_width = window_size;
    
            redo_graphs();

            SPICY_COVID_NS.clip_bounding_box_by_graph(); 
            SPICY_COVID_NS.arrange_region_labels();
            
            SPICY_COVID_NS.hold_resize = false;
          }, 500, "Graph update" + _date_timer.getTime());
       
      });

    
    function redo_graphs() {
        "use strict";
        var _region_list = SPICY_COVID_NS.regions_of_interest;
        var buffer = [];
        for (var i = 0; i< _region_list.length; i++) { //buffer the regions
            var try_region = SPICY_COVID_NS.create_region_of_interest(buffer, _region_list[i].region, _region_list[i].context, true)
        }
        // inform(buffer);
        SPICY_COVID_NS.clear_all(false);
        SPICY_COVID_NS.initialize_graph(); //browser context is changed in function <-
        // inform(buffer);
        // var num = buffer.length;
        // if (num > 35) {
        //     num = 10;
        // }
        SPICY_COVID_NS.regions_of_interest = buffer;
        for (var i = 0; i < SPICY_COVID_NS.regions_of_interest.length; i++) {
            // SPICY_COVID_NS.create_region_of_interest(SPICY_COVID_NS.regions_of_interest, buffer[i].region, buffer[i].context)
            SPICY_COVID_NS.add_region_to_graph(SPICY_COVID_NS.regions_of_interest, i, SPICY_COVID_NS.regions_of_interest[i].context);
        }
    }

    //Timer for rolling day avg input box check
    function check_for_avg_change() {
        "use strict";

        var val = $('#rolling_days').val(); //Get
        // var val2 = $('#rollingavgslider').val(); //Get
        var checked = $('#sevendayavg').is(':checked');

        if (val == SPICY_COVID_NS.last_rolling_val && checked == SPICY_COVID_NS.last_rolling_bool) return; //Nothing has actually changed so return


        if (val < 3) val = 3; //Rolling averages only make sense when they're above 1...
        if (val % 2 == 0) {   //...and odd
            inform("The rolling day average must be odd.");
            val --;
            $('#rolling_days').val(val) //Set
        }

        SPICY_COVID_NS.rolling_day_value = val;
        SPICY_COVID_NS.update_rolling_average(SPICY_COVID_NS.regions_of_interest, true);

        SPICY_COVID_NS.last_rolling_val = val;
        // this.last_val2 = val;
        SPICY_COVID_NS.last_rolling_bool = checked;
        inform(SPICY_COVID_NS.board);
    }
    // setInterval(check_for_avg_change, 1000);

});




