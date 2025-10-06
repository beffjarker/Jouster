speed = eval("/:speed");
orig_x = "294";
target_x = "430";
diff_x = target_x - orig_x;
if(target_x < old_x)
{
   _X = "294";
}
step_x = diff_x / speed;
old_x = _X;
_X = old_x + step_x;
