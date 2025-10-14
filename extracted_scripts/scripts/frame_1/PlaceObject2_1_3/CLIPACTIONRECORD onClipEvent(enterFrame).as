onClipEvent(enterFrame){
   if(count > 0)
   {
      _parent.next_num = _parent.last_one + _parent.last_two;
      _parent.last_two = _parent.last_one;
      _parent.last_one = _parent.next_num;
      _parent.current_sequence = _parent.sequence;
      _parent.sequence = _parent.current_sequence + ", " + _parent.next_num;
      count -= 1;
   }
}
