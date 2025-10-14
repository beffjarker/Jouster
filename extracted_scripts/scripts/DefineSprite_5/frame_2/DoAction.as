linecount += "1";
duplicateMovieClip("../line","newline" add linecount,linecount + 16384);
setProperty("../newline" add linecount, _X, getProperty("../leader", _X));
setProperty("../newline" add linecount, _Y, getProperty("../leader", _Y));
setProperty("../newline" add linecount, _xscale, getProperty("../follower", _X) - getProperty("../leader", _X));
setProperty("../newline" add linecount, _yscale, getProperty("../follower", _Y) - getProperty("../leader", _Y));
if(linecount == "1500")
{
   linecount = "0";
}
