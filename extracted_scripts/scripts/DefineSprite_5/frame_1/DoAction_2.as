follower_x = getProperty("../follower", _X);
if(direction_x == "1")
{
   next_x = follower_x + "5";
}
if(direction_x == "0")
{
   next_x = follower_x - "5";
}
setProperty("../follower", _X, next_x);
if(next_x == "50")
{
   direction_x = "1";
}
if(next_x == "550")
{
   direction_x = "0";
}
