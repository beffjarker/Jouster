boxcount = Number(boxcount) + 1;
if(Number(boxcount) <= 300)
{
   duplicateMovieClip(_parent.boxMC,"boxMC" + boxcount,16384 + boxcount);
   _parent["boxMC" + boxcount]._x = _parent.current_x;
   _parent["boxMC" + boxcount]._y = _parent.current_y;
   gotoAndStop(1);
}
