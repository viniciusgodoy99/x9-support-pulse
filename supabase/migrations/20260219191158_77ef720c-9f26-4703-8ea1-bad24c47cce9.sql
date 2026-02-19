
-- =====================================================
-- SECURITY FIX: Replace permissive RLS policies with
-- authenticated-only access on all tables
-- =====================================================

-- 1. Drop all existing permissive policies
DROP POLICY IF EXISTS "Allow all access to messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all access to tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow all access to team_members" ON public.team_members;
DROP POLICY IF EXISTS "Allow all access to monitored_groups" ON public.monitored_groups;
DROP POLICY IF EXISTS "Allow all access to whatsapp_instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Allow all access to settings" ON public.settings;
DROP POLICY IF EXISTS "Allow all access to group_members" ON public.group_members;
DROP POLICY IF EXISTS "Allow all access to ticket_demands" ON public.ticket_demands;
DROP POLICY IF EXISTS "Allow all access to sla_notifications" ON public.sla_notifications;

-- 2. Create user_roles table (store roles separately to avoid privilege escalation)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.user_has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Security definer function to check if user is authenticated member
CREATE OR REPLACE FUNCTION public.is_authenticated_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- 5. RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.user_has_role(auth.uid(), 'admin'));

-- 6. MESSAGES - authenticated users only
CREATE POLICY "Authenticated users can read messages"
ON public.messages FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update messages"
ON public.messages FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete messages"
ON public.messages FOR DELETE
USING (auth.uid() IS NOT NULL);

-- 7. TICKETS - authenticated users only
CREATE POLICY "Authenticated users can read tickets"
ON public.tickets FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert tickets"
ON public.tickets FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tickets"
ON public.tickets FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete tickets"
ON public.tickets FOR DELETE
USING (auth.uid() IS NOT NULL);

-- 8. TEAM_MEMBERS - authenticated users only
CREATE POLICY "Authenticated users can read team members"
ON public.team_members FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert team members"
ON public.team_members FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update team members"
ON public.team_members FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete team members"
ON public.team_members FOR DELETE
USING (auth.uid() IS NOT NULL);

-- 9. MONITORED_GROUPS - authenticated users only
CREATE POLICY "Authenticated users can read monitored groups"
ON public.monitored_groups FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert monitored groups"
ON public.monitored_groups FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update monitored groups"
ON public.monitored_groups FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete monitored groups"
ON public.monitored_groups FOR DELETE
USING (auth.uid() IS NOT NULL);

-- 10. WHATSAPP_INSTANCES - admin only (contains API tokens)
CREATE POLICY "Admins can manage whatsapp instances"
ON public.whatsapp_instances FOR ALL
USING (public.user_has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can read whatsapp instances"
ON public.whatsapp_instances FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 11. SETTINGS - admin only
CREATE POLICY "Admins can manage settings"
ON public.settings FOR ALL
USING (public.user_has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can read settings"
ON public.settings FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 12. GROUP_MEMBERS - authenticated users only
CREATE POLICY "Authenticated users can read group members"
ON public.group_members FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert group members"
ON public.group_members FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update group members"
ON public.group_members FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete group members"
ON public.group_members FOR DELETE
USING (auth.uid() IS NOT NULL);

-- 13. TICKET_DEMANDS - authenticated users only
CREATE POLICY "Authenticated users can read ticket demands"
ON public.ticket_demands FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert ticket demands"
ON public.ticket_demands FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update ticket demands"
ON public.ticket_demands FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete ticket demands"
ON public.ticket_demands FOR DELETE
USING (auth.uid() IS NOT NULL);

-- 14. SLA_NOTIFICATIONS - authenticated users only
CREATE POLICY "Authenticated users can read sla notifications"
ON public.sla_notifications FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert sla notifications"
ON public.sla_notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update sla notifications"
ON public.sla_notifications FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete sla notifications"
ON public.sla_notifications FOR DELETE
USING (auth.uid() IS NOT NULL);
