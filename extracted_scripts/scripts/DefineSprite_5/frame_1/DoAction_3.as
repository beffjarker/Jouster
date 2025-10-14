leader_y = getProperty("../leader", _Y);
if(direction_y == "1")
{
   next_y = leader_y - "5";
}
if(direction_y == "0")
{
   next_y = leader_y + "5";
}
setProperty("../leader", _Y, next_y);
if(next_y == "550")
{
   direction_y = "1";
}
if(next_y == "50")
{
   direction_y = "0";
}
if(next_y == "300")
{
   count_y += "1";
   if(count_y == "2")
   {
      stop();
   }
}
