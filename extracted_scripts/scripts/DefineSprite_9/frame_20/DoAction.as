count += "1";
currentx = getProperty("../follow", _xscale);
currenty = getProperty("../follow", _yscale);
if("25" >= count)
{
   if("200" < currentx)
   {
      gotoAndPlay(10);
      count = "0";
   }
   else
   {
      setProperty("../follow", _xscale, currentx * "1.01");
      setProperty("../follow", _yscale, currenty * "1.01");
   }
}
else
{
   gotoAndPlay(1);
}
