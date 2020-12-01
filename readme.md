![Logo](/img/Spicy_Covid_Graphs_Logo.png)
Link: (http://covid19graphs.42web.io/)


### Features:
Always shows data as percentage of population, so comparisons between regions is easier.

Rolling average slider.
Always fills curves transparently -- mostly for aesthetic reasons, but also because it is sometimes easier to visualize differences between regions.
Totals printed to text area for ranking comparison across N number of days.
Ranking in the graph by total or peak.
Ability to add N top regions in a dataset by last N number of days. For seeing say the bottom 10 regions, one can add the top N regions, then remove the (N - 10) regions.

### FAQ:
Q. TBD 

A. TBD

### Major Bugs
12/1/2020: Firefox does not change the logo responsively to window.resize

### Recently Fixed Bugs
12/1/2020: Check pushes

### Superficial Bugs
12/1/2020: Mobile footer displays partly off the footer gradient

### Potential Enhancements
Zoom out show letters for months instead of abbreviations
Find way to change selected region curve on top (JSXGraph feature / limitation)
Add remove region by context functionality
Add dual axis for easier comparison of deaths to cases
Test mobile more
Add 'clear' button for text area
Test more mobile screen rotations
Add text box log for remove_top regions
Note why some colors are outlined in mobile on main page
Add Tabs
Add curve guessing using logarthmic regression that has decay
Mobile zoom: find a way to consolidate separate vert, horiz, and diagonal two finger zooming (JSXGraph feature / limitation)
Consider refactoring alt_axes to not include sub-functions for better memory management
Consider adding checkbox to switch x-axis styles

### Limitations
Graphs are not displayed well on mobile platforms in general.

### Sources & Notes

#### This uses my Python data transposing project

(https://github.com/idealius/transpose_covid_timeseries)

#### Country Data

Johns Hopkins Death and Confirmed Cases Data:

(https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv) 

(https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv) 

#### State Data

Johns Hopkins Death and Confirmed Cases Data:

(https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv) 

(https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv) 


Thank you