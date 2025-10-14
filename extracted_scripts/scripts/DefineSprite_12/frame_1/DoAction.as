speed = eval("/:speed");
orig_x = "430";
target_x = "294";
diff_x = target_x - orig_x;
if(old_x < target_x)
{
   _X = "430";
}
step_x = diff_x / speed;
old_x = _X;
_X = old_x + step_x;
