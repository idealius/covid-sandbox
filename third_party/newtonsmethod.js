
//Original code from https://gist.github.com/TragicSolitude/796f2a1725e9abf13638
var prevGuess = 0;

// function f(x) {
//     return Math.sin(x);
// }


function derivative(fun, P, prec) {
    var h = prec;
    return function(x) { return (fun(x + h, P) - fun(x - h, P)) / (2 * h); };
}

//Recursive function
function newtonsMethod(fun, P, prec, guess, restart) {
    if (restart) prevGuess = 0;
    if (guess === null || guess === undefined)
        guess = prec;

    if (Math.abs(prevGuess - guess) > prec) {
        prevGuess = guess;
        var approx = guess - (fun(guess, P) / derivative(fun, P, prec)(guess));

        // console.log(guess);
        // // console.log(f(guess));
        // // console.log(derivative(f)(guess));
        // // console.log(approx);
        // console.log('\n');

        return newtonsMethod(fun, P, prec, approx);
    } else {
        return guess;
    }
}

console.log(newtonsMethod(3));