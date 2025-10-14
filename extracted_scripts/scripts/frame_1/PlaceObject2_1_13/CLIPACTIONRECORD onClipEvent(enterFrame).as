onClipEvent(enterFrame){
   linecount = 0;
   point03_x = point03._x;
   point03_y = point03._y;
   diffmover01_x = _parent.mover01._x - _parent.mover02._x;
   diffmover01_y = _parent.mover01._y - _parent.mover02._y;
   diffmover02_x = _parent.point03._x - _parent.mover02._x;
   diffmover02_y = _parent.point03._y - _parent.mover02._y;
   while(linecount < howmanylines + 1)
   {
      oldmover01_x = _parent.mover01._x;
      oldmover01_y = _parent.mover01._y;
      oldmover02_x = _parent.mover02._x;
      oldmover02_y = _parent.mover02._y;
      stepmover01_x = diffmover01_x / howmanylines;
      stepmover01_y = diffmover01_y / howmanylines;
      stepmover02_x = diffmover02_x / howmanylines;
      stepmover02_y = diffmover02_y / howmanylines;
      duplicateMovieClip("_parent.line","newline" + linecount,16384 + linecount);
      setProperty("_parent.newline" + linecount, _X, _parent.mover02._x);
      setProperty("_parent.newline" + linecount, _Y, _parent.mover02._y);
      setProperty("_parent.newline" + linecount, _xscale, _parent.mover01._x - _parent.mover02._x);
      setProperty("_parent.newline" + linecount, _yscale, _parent.mover01._y - _parent.mover02._y);
      setProperty("_parent.mover01", _X, oldmover01_x - stepmover01_x);
      setProperty("_parent.mover01", _Y, oldmover01_y - stepmover01_y);
      setProperty("_parent.mover02", _X, oldmover02_x + stepmover02_x);
      setProperty("_parent.mover02", _Y, oldmover02_y + stepmover02_y);
      linecount++;
   }
   setProperty("_parent.mover01", _X, _parent.point01._x);
   setProperty("_parent.mover01", _Y, _parent.point01._y);
   setProperty("_parent.mover02", _X, _parent.point02._x);
   setProperty("_parent.mover02", _Y, _parent.point02._y);
}
