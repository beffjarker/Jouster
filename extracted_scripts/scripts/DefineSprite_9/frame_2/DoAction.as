setProperty("line", _visible, "0");
duplicateMovieClip("line","newLine1","16385");
setProperty("newLine1", _X, getProperty("redsquare", _X));
setProperty("newLine1", _Y, getProperty("redsquare", _Y));
setProperty("newLine1", _xscale, getProperty("cross", _X) - getProperty("redsquare", _X));
setProperty("newLine1", _yscale, getProperty("cross", _Y) - getProperty("redsquare", _Y));
