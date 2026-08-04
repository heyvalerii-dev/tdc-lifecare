-- Seed data for development

-- Two psychologists
INSERT INTO psychologists (id, slug, name, title, bio, specialties, email, license_number, photo_url) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'gian-carlo-tolentino', 'Gian Carlo Tolentino', 'PRC-Licensed Psychologist', 'Supports adults and young professionals navigating anxiety, depression, and trauma.', ARRAY['Anxiety', 'Depression', 'Trauma'], 'gian@tdclifecare.com', NULL, '/psychologists/gian-carlo.jpg'),
  ('a0000000-0000-0000-0000-000000000002', 'april-anne-tolentino-cerezo', 'April Anne Tolentino-Cerezo', 'PRC-Licensed Psychologist', 'Specializes in supporting children, adolescents, and families.', ARRAY['Children', 'Families', 'ADHD'], 'april@tdclifecare.com', NULL, '/psychologists/april-anne.jpg');

-- Services
INSERT INTO services (id, name, description, price_cents, duration_minutes, buffer_minutes) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Therapy Session', 'Individual therapy session for ongoing mental health support.', 350000, 60, 30),
  ('b0000000-0000-0000-0000-000000000002', 'Initial Consultation', 'First-time consultation to assess needs and create a treatment plan.', 250000, 60, 30),
  ('b0000000-0000-0000-0000-000000000003', 'Psychological Assessment', 'Comprehensive psychological assessment and evaluation.', 800000, 180, 30),
  ('b0000000-0000-0000-0000-000000000004', 'Couples Therapy', 'Joint therapy session for couples.', 450000, 90, 30);

-- Link services to psychologists
INSERT INTO psychologist_services (psychologist_id, service_id) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004');

-- Availability: Mon-Fri 9am-5pm for both psychologists
INSERT INTO availability_blocks (psychologist_id, day_of_week, start_time, end_time)
SELECT p.id, d.day, '09:00'::TIME, '17:00'::TIME
FROM psychologists p
CROSS JOIN (VALUES (1),(2),(3),(4),(5)) AS d(day);

-- Default questionnaire
INSERT INTO questionnaires (id, title, description, questions) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Pre-Session Intake Form', 'Please complete this form before your appointment.', '[
    {"id": "reason", "type": "textarea", "label": "What brings you to therapy today?", "required": true},
    {"id": "previous_therapy", "type": "select", "label": "Have you had therapy before?", "required": true, "options": ["Yes", "No"]},
    {"id": "medications", "type": "textarea", "label": "Are you currently taking any medications?", "required": false},
    {"id": "emergency_contact", "type": "text", "label": "Emergency contact name and phone", "required": true},
    {"id": "consent", "type": "checkbox", "label": "I consent to receive psychological services and understand the clinic policies.", "required": true}
  ]'::JSONB);
