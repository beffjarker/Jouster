if(Number(direction) == 0 and (Number(step_x) > Number(-0.1) and Number(step_x) < 0.1))
{
   speed = 100;
   direction = random(2);
   if(Number(direction) == 0)
   {
      target_x = Number(random(641)) + 1;
   }
   else
   {
      target_y = Number(random(273)) + 1;
   }
   if(Number(firsttime) == 0)
   {
      firsttime = 1;
   }
   else
   {
      _parent.current_x = _X;
      _parent.current_y = _Y;
      tellTarget("../boxplacementcontrol")
      {
         gotoAndPlay(1);
      }
   }
}
else if(Number(direction) == 1 and (Number(step_y) > Number(-0.1) and Number(step_y) < 0.1))
{
   speed = Number(random(51)) + 10;
   direction = random(2);
   if(Number(direction) == 0)
   {
      target_x = Number(random(641)) + 1;
   }
   else
   {
      target_y = Number(random(273)) + 1;
   }
   if(Number(firsttime) == 0)
   {
      firsttime = 1;
   }
   else
   {
      _parent.current_x = _X;
      _parent.current_y = _Y;
      tellTarget("../boxplacementcontrol")
      {
         gotoAndPlay(1);
      }
   }
}
if(Number(direction) == 0)
{
   old_x = _X;
   new_x = target_x - old_x;
   step_x = new_x / speed;
   _X = Number(old_x) + Number(step_x);
}
else
{
   old_y = _Y;
   new_y = target_y - old_y;
   step_y = new_y / speed;
   _Y = Number(old_y) + Number(step_y);
}
