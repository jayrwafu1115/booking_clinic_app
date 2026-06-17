-- Switch revenue calculation from completed appointments to paid invoices.
-- The previous version summed services.price_centavos on completed appointments.
-- Revenue is now the sum of invoices.total_centavos where status = 'paid',
-- scoped to the same date range (using invoices.created_at).

create or replace function get_clinic_appointment_stats(
  p_clinic_id uuid,
  p_start_at  timestamptz,
  p_end_at    timestamptz
)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with appts as (
    select
      a.status,
      a.source,
      a.doctor_id,
      a.service_id,
      s.name          as service_name,
      s.price_centavos,
      d.full_name     as doctor_name
    from public.appointments a
    left join public.services s on s.id = a.service_id
    left join public.doctors  d on d.id = a.doctor_id
    where a.clinic_id = p_clinic_id
      and a.start_at >= p_start_at
      and a.start_at <  p_end_at
  ),
  paid_rev as (
    select coalesce(sum(total_centavos), 0) as revenue_centavos
    from public.invoices
    where clinic_id = p_clinic_id
      and status    = 'paid'
      and created_at >= p_start_at
      and created_at <  p_end_at
  ),
  counts as (
    select
      count(*)                                                   as total,
      count(*) filter (where status = 'completed')               as completed,
      count(*) filter (where status = 'confirmed')               as confirmed,
      count(*) filter (where status = 'cancelled')               as cancelled,
      count(*) filter (where status = 'no_show')                 as no_show,
      count(*) filter (where status = 'booked')                  as booked,
      (select revenue_centavos from paid_rev)                    as revenue_centavos,
      count(*) filter (where source in ('ai', 'widget'))         as ai_sourced,
      count(*) filter (where source = 'widget')                  as widget_sourced,
      count(*) filter (where source = 'manual')                  as manual_sourced
    from appts
  ),
  status_bd as (
    select coalesce(
      json_agg(json_build_object('status', status, 'count', cnt) order by cnt desc),
      '[]'::json
    ) as data
    from (select status, count(*) as cnt from appts group by status) x
  ),
  source_bd as (
    select coalesce(
      json_agg(json_build_object('source', source, 'count', cnt) order by cnt desc),
      '[]'::json
    ) as data
    from (select source, count(*) as cnt from appts group by source) x
  ),
  top_svc as (
    select coalesce(
      json_agg(
        json_build_object(
          'service_id',       service_id,
          'service_name',     service_name,
          'count',            cnt,
          'revenue_centavos', rev
        ) order by cnt desc
      ),
      '[]'::json
    ) as data
    from (
      select
        service_id,
        service_name,
        count(*)                                                             as cnt,
        coalesce(sum(price_centavos) filter (where status = 'completed'), 0) as rev
      from appts
      where service_id is not null
      group by service_id, service_name
      order by cnt desc
      limit 8
    ) x
  ),
  doc_stats as (
    select coalesce(
      json_agg(
        json_build_object(
          'doctor_id',   doctor_id,
          'doctor_name', doctor_name,
          'total',       total,
          'completed',   comp
        ) order by total desc
      ),
      '[]'::json
    ) as data
    from (
      select
        doctor_id,
        doctor_name,
        count(*)                                       as total,
        count(*) filter (where status = 'completed')  as comp
      from appts
      where doctor_id is not null
      group by doctor_id, doctor_name
    ) x
  )
  select json_build_object(
    'total',            c.total,
    'completed',        c.completed,
    'confirmed',        c.confirmed,
    'cancelled',        c.cancelled,
    'no_show',          c.no_show,
    'booked',           c.booked,
    'revenue_centavos', c.revenue_centavos,
    'ai_sourced',       c.ai_sourced,
    'widget_sourced',   c.widget_sourced,
    'manual_sourced',   c.manual_sourced,
    'status_breakdown', s.data,
    'source_breakdown', sr.data,
    'top_services',     ts.data,
    'doctor_stats',     ds.data
  )
  from counts c, status_bd s, source_bd sr, top_svc ts, doc_stats ds
$$;
