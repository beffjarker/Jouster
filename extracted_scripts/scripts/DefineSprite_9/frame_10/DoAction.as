count += "1";
currentx = getProperty("../follow", _xscale);
currenty = getProperty("../follow", _yscale);
if("25" >= count)
{
   if(currentx < "25")
   {
      gotoAndPlay(20);
      count = "0";
   }
   else
   {
      setProperty("../follow", _xscale, currentx * "0.99");
      setProperty("../follow", _yscale, currenty * "0.99");
   }
}
else
{
   gotoAndPlay(1);
}
