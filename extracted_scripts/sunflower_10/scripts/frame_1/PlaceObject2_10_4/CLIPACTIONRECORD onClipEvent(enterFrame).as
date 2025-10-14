onClipEvent(enterFrame){
   if(360 < angle)
   {
      angle -= 360;
   }
   duplicateMovieClip(_parent.circle,"circle" + count,16384 + count);
   angle += step;
   _parent["circle" + count]._rotation = angle;
   count += 1;
}
