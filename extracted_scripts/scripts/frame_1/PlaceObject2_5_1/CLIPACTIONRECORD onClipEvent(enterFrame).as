onClipEvent(enterFrame){
   if(stopVar != 1)
   {
      newX = Math.sin(a / 180 * 3.141592653589793) * h;
      newY = Math.cos(a / 180 * 3.141592653589793) * h;
      duplicateMovieClip(pixel,"pixel" + count,16384 + count);
      this["pixel" + count]._x = newX;
      this["pixel" + count]._y = verticalCount;
      this["pixel" + count]._rotation = random(359) + 1;
      newXScale = newY + Math.abs(newY);
      newYScale = newY + Math.abs(newY);
      if(newYScale < 4)
      {
         newYScale = 4;
      }
      if(newXScale < 4)
      {
         newXScale = 4;
      }
      this["pixel" + count]._xscale = newXScale;
      this["pixel" + count]._yscale = newYScale;
      if(360 < a)
      {
         a = 360 - a;
      }
      else if(a < 0)
      {
         a = 360 + a;
      }
      a -= aIncrement;
      verticalCount -= vIncrement;
      h -= hIncrement;
      count++;
      if(0 >= h)
      {
         stopVar = 1;
      }
   }
}
