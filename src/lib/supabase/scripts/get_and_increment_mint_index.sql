create or replace function get_and_increment_mint_index(ordinals_address text)
returns bigint
language plpgsql
as $$
declare
  current_index bigint;
begin
  loop
    update mint_state
    set next_mint_index = next_mint_index + 1,
        updated_at = now()
    where mint_state.ordinals_address = get_and_increment_mint_index.ordinals_address
    returning next_mint_index - 1 into current_index;
    if found then
      return current_index;
    end if;

    begin
      insert into mint_state (ordinals_address, next_mint_index)
      values (get_and_increment_mint_index.ordinals_address, 1);
      return 0;
    exception when unique_violation then
      -- If another transaction inserted, loop and try again
    end;
  end loop;
end;
$$;
