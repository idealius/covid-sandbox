![Logo](/img/Spicy_Covid_Graphs_Logo.png)

<!--Link: (http://covid19graphs.42web.io/)-->

This is a working demo of this project locked in at 05/31/22:

(https://idealius.github.io/)


### Elevator version:

JavaScript, some CSS, HTML, and Linux/Windows Shell scripts for a website that takes regularly updated CV19 data which has been transposed, Then it allows one to overlay multiple regions in the US or Internationally. Uses JSXGraph and JQuery combined with a technique to circumnavigate CORS restrictions, making it appropriate to use with a free web host.  It uses linear regression, but at one time supported polynomial regression with arbitrary number of terms to match multiple surges in one large piecewise function.

### Purpose:
Early on during 2020 when doing personal risk assessment of COVID-19 in different contexts like local and global regions, other dashboards did not make it easy see regions overlayed and per population total with adjustable moving averages. To rectify this would involve a lot of copy/pasting and data transposing in spreadsheets like Excel. The Python project listed in sources below is used to transpose Johns Hopkins data and convert it to rates. This makes the data easy to use in Tableau, Excel, etc.

This project then takes that data outputted from the Python project (which also converts the data to .js files) and allows one to quickly overlay different regions - by user selection - or by ranking across N number of days for cases and deaths to display on a dynamic website.

I accept no liability for any damages that comes from the usage of this project or anything it implies. You are free to distribute it as long as you keep a copy of any liability or licensing information included.

### Features:
Always shows data as percentage of population, so comparisons between regions is easier.

Zoom and panning.

Rolling average slider.

Filled curves option, sometimes better for detecting patterns.

Totals printed to text area for ranking comparison across N number of days.

Ranking in the graph by total, peak, or slope acrss N days.

Ability to add N top regions in a dataset by last N number of days either by slope or total.

For seeing, say the bottom 10 regions, one can add the top N regions, then remove the (N - 10) regions.

### FAQ:
Q. When does the text area below the graphs update?

A. When you Show the top N regions across the last X days. It prints out different numbers depending which option you choose for "regions by" -- "Highest Total" -> Total deaths % across X days, or "Fastest Rising" -> Linearly regressed slope over X days.

Q. Why does the "Generate Curves" button say "experimental".

A. Some combination of "I'm working on it." or, "Results are not ideal." As of now, it is disabled.

### Major Bugs
1/10/2021: BUG with west virginia and virginia and BUG Congo DR of Congo because names are inclusive (FIXED: 1/13/2021)

12/1/2020: Firefox does not change the logo responsively to window.resize

### Recently Fixed Bugs
12/1/2020: Check pushes

### Superficial Bugs
12/1/2020: Mobile footer displays partly off the footer gradient

1/13/2021: Sometimes dragging a region label doesn't update the pointing line position. This might be a bug in JSXGraph. It can be resolved by hovering over the label a few more times.

### Potential Enhancements
A feature to save multiple layouts of graphs with unique names would be nice.

A popout to show a full screen graph would also be nice.

Zoom out show letters for months instead of abbreviations - Added

Find way to change selected region curve on top (JSXGraph feature / limitation)

Add remove region by context functionality - Hide feature Added

Add dual axis for easier comparison of deaths to cases

Test mobile more

Add 'clear' button for text area

Test more mobile screen rotations

Note why some colors are outlined in mobile on main page

Add Tabs or popup dialogs for more options

Add curve guessing using logarthmic regression that has decay - This has been added.

Mobile zoom: find a way to consolidate separate vert, horiz, and diagonal two finger zooming (JSXGraph feature / limitation)

Consider refactoring alt_axes to not include sub-functions for better memory management

Consider adding checkbox to switch x-axis styles

### Limitations
Some of the Label positions and when they update could be better.

No hospitalization data.

Graphs are not displayed well on mobile platforms in general because the screen width & height of phones.

### Sources & Notes

#### Third party software packages:

This project uses JQuery (https://jquery.com/) and JSXGraph (https://jsxgraph.uni-bayreuth.de/wp/index.html) extensively 

This project was helped tremendously by http://www.stackoverflow.com
For the deprecated curve matching it uses a small project (fminsearch) from: https://github.com/jonasalmeida/fminsearch
(fminsearch is a function straight out of R as far as I know)

And, it may at some point include this small project which is an implementation of Newton's Method (it does include the feature, but it tends to be too constraining so its disabled):
https://gist.github.com/TragicSolitude/796f2a1725e9abf13638

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
