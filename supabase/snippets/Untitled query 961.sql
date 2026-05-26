delete from auth.users where created_at > now() - interval '1 hour';

select * from push_subscriptions