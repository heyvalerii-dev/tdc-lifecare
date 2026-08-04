-- Row Level Security Policies

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychologists ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychologist_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE unavailable_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (is_admin());

-- Psychologists (public read for active)
CREATE POLICY "Anyone can view active psychologists"
  ON psychologists FOR SELECT
  USING (is_active = TRUE OR is_admin());

CREATE POLICY "Admins manage psychologists"
  ON psychologists FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Services (public read for active)
CREATE POLICY "Anyone can view active services"
  ON services FOR SELECT
  USING (is_active = TRUE OR is_admin());

CREATE POLICY "Admins manage services"
  ON services FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Psychologist services
CREATE POLICY "Anyone can view psychologist services"
  ON psychologist_services FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins manage psychologist services"
  ON psychologist_services FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Availability blocks
CREATE POLICY "Anyone can view active availability"
  ON availability_blocks FOR SELECT
  USING (is_active = TRUE OR is_admin());

CREATE POLICY "Admins manage availability"
  ON availability_blocks FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Unavailable blocks
CREATE POLICY "Anyone can view unavailable blocks"
  ON unavailable_blocks FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins manage unavailable blocks"
  ON unavailable_blocks FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Questionnaires
CREATE POLICY "Anyone can view active questionnaires"
  ON questionnaires FOR SELECT
  USING (is_active = TRUE OR is_admin());

CREATE POLICY "Admins manage questionnaires"
  ON questionnaires FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Appointments
CREATE POLICY "Clients view own appointments"
  ON appointments FOR SELECT
  USING (auth.uid() = client_id OR is_admin());

CREATE POLICY "Anyone can view appointment for payment page"
  ON appointments FOR SELECT
  USING (status = 'pending_payment');

CREATE POLICY "Clients create own appointments"
  ON appointments FOR INSERT
  WITH CHECK (auth.uid() = client_id OR is_admin());

CREATE POLICY "Clients update own pending appointments"
  ON appointments FOR UPDATE
  USING (auth.uid() = client_id OR is_admin())
  WITH CHECK (auth.uid() = client_id OR is_admin());

-- Questionnaire responses
CREATE POLICY "Clients view own responses"
  ON questionnaire_responses FOR SELECT
  USING (auth.uid() = client_id OR is_admin());

CREATE POLICY "Clients submit own responses"
  ON questionnaire_responses FOR INSERT
  WITH CHECK (auth.uid() = client_id OR is_admin());

-- Payments
CREATE POLICY "Clients view own payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_id AND (a.client_id = auth.uid() OR is_admin())
    )
    OR EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_id AND a.status = 'pending_payment'
    )
  );

CREATE POLICY "Clients create payments for own appointments"
  ON payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_id AND (a.client_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "Admins and service role update payments"
  ON payments FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Clinic settings
CREATE POLICY "Anyone can read clinic settings"
  ON clinic_settings FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins update clinic settings"
  ON clinic_settings FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());
