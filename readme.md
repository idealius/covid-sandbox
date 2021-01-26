![Logo](/img/Spicy_Covid_Graphs_Logo.png)

Link: (http://covid19graphs.42web.io/index.html) <- Bookmark this manually, as it redirects to a new page every day to ensure the datasets are updated.

Datasets will normally be accessible maybe by 1 or 2 AM. I do not have a dedicated server to update the data so sometimes it will be late.

Datasets hinge on Johns Hopkins accuracy and file formats remaining the same. For instance around early December New Jersey's data was amplified to a great extent, errorneously, over one day. Johns Hopkins fixed the error within hours. In that spirit, I am not responsible for data misrepresentations in part or whole whether the fault of myself, the software, or their sources. 

### Purpose:
When doing personal risk assessment of COVID-19 in different contexts like local and global regions, other dashboards did not make it easy see regions overlayed and per population total with adjustable moving averages. To rectify this would involve a lot of copy/pasting and data transposing in spreadsheets like Excel. The Python project listed in sources below is used to transpose Johns Hopkins data and convert it to rates. This makes the data easy to use in Tableau, Excel, etc.

This project then takes that data outputted from the Python project (which also converts the data to .js files) and allows one to quickly overlay different regions - by user selection - or by ranking across N number of days for cases and deaths.

Please note that I am not a disease expert, nor even a very accredited programmer. This is a project I made for my own use, but also decided to share for those who might like to play with it. Use at your own risk.

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

A. Some combination of "I'm working on it." or, "Results are not ideal." As of now, it works pretty well with many (most?) areas having R squared values higher than .99

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