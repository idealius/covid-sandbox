const board = JXG.JSXGraph.initBoard('jsxgbox', { 
    boundingbox: [-.0002, .0008, .0008, -.0002], axis:true,
		zoom: {
            pinchHorizontal: false,
            pinchVertical: false,
            pinchSensitivity: 7,
            min: 0.000001,
            max: 9999999,
            wheel: true,
            needShift: false
        },


 });

$(document).ready(function() {
   "use strict";
    $.ajax({
        type: "GET",
        url: "data\time_series_covid19_deaths_US_rate.csv",
        dataType: "text",
        success: function(data) {processData(data);}
     });
});

function processData(icd10Codes) {
    "use strict";
    var input = $.csv.toArrays(icd10Codes);
    $("#test").append(input);
}