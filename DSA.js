// Plus one DSA implementation for educational purposes 
// Given a non-empty array of decimal digits representing a non-negative integer,
// increment one to the integer.
// First convert the array of digits to a single integer, add one to it,
// and then convert it back to an array of digits.

function plusOne(digits) {
    // Convert array of digits to a single integer
    let num = BigInt(digits.join(''));
    // Increment the integer by one
    num += BigInt(1);
    // Convert the incremented integer back to an array of digits
    return num.toString().split('').map(digit => parseInt(digit));
}