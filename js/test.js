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

JXG.Options.text.display = 'internal'; //needed for text to work on webkit / firefox

JXG.Options.text.cssClass = 'jsxgDefaultFont';
// JXG.Options.cssDefaultStyle = 'jsxgDefaultFont';

inform(JXG.Options);

board = JXG.JSXGraph.initBoard('jsxgbox', {
    boundingbox: [-1,15,15,-1],
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
        factorX: 1.25,
        factorY: 1.25,
        wheel: true,
        needshift: false,
        eps: 0.1
    },
    // pan: {
    //     needTwoFingers: true,
    //     needShift: false
    // },

    showZoom: false,
    showNavigation: false,
});

var x = [...Array(10).keys()];
var y = [...Array(10).keys()];
var test_x = 2;

var p2 = board.create('point', [3.5, function () { return 2; }], {name: '2'});
var p0 = board.create('point', [0,0], {name:'0'});

var test_x = 9;

        var txt = board.create('text', [0,0, " <span id='par'>(</span> Hello world <span id='par'>)</span>"], 
          {
            cssClass:'myFont', strokeColor:'red',
            // highlightCssClass: 'myFontHigh',
            fontSize:20
          });

board.update();
// var region_txt_obj = this.board.create('text', [
//     //X,Y value:
//     0,0,
//     // COVID_SANDBOX_NS.get_max_graph_affected(Number(graph_index)).x,
//     // COVID_SANDBOX_NS.get_max_graph_affected(Number(graph_index)).y + COVID_SANDBOX_NS.get_max_graph_affected(Number(graph_index)).y / 5,
//     region_txt
//     ], {
//     // cssClass: "region_labels",
//     // strokeColor:_selected_region.color,
//     dragToTopOfLayer: true
// });
// inform(region_txt_obj);



// var graph = this.board.create('curve', [x,y], {
//     // name: String(_selected_region[0]["Province_State"]),
//     // id: String(_selected_region[0]["Province_State"]),
//     // label:{autoPosition: true, offset:[0, 0], anchorX: 'middle', anchorY: 'middle'},
//     strokeColor:my_color,
//     fillColor:my_color, 
//     fillOpacity:.5, 
//     name:"curve", 
//     strokeWidth:1.5,
//     fixed: true
// });
// inform(graph);
// construct = new this.graph_status_obj(region_txt_obj, graph, -1, my_color); // set rolling avg to -1 so its updated later


// this.board.removeObject(region_txt_obj);


// this.graphs.push(construct);

// this.add_tidy_endpoints(this.graphs[graph_index].graph_data_obj);



// translate_text.bindTo(this.graphs[graph_index].region_obj);



p2.setPosition(5, 5, 2000);
