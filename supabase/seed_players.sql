-- ARM — Belsize Park RFC Test Players
-- Paste into Supabase SQL Editor and run
-- Covers all positions, mixed types/statuses for testing filters

INSERT INTO players (name, phone, primary_position, secondary_positions, player_type, status, subscription_paid, notes, email, date_of_birth)
VALUES

-- PROPS (x4)
('Jamie Okafor',        '+447911123001', 'Prop',       '["Hooker"]',              'Performance', 'Active',    true,  'Loosehead specialist, strong in scrum', 'jamie.okafor@email.com',    '1994-03-12'),
('Marcus Webb',         '+447911123002', 'Prop',       '[]',                      'Performance', 'Active',    true,  'Tighthead, recently returned from injury', 'marcus.webb@email.com',  '1990-07-22'),
('Dan Kowalski',        '+447911123003', 'Prop',       '["Lock"]',                'Open',        'Active',    false, '',                                          'dan.kowalski@email.com',   '1997-11-05'),
('Steve Hargreaves',    '+447911123004', 'Prop',       '[]',                      'Open',        'Injured',   true,  'Shoulder — out 4 weeks',                    'steve.h@email.com',        '1988-09-18'),

-- HOOKERS (x3)
('Tom Brennan',         '+447911123005', 'Hooker',     '["Prop"]',                'Performance', 'Active',    true,  'Captain material, lineout caller',          'tom.brennan@email.com',    '1993-05-30'),
('Elliot Patel',        '+447911123006', 'Hooker',     '[]',                      'Open',        'Active',    false, '',                                          'elliot.patel@email.com',   '1999-02-14'),
('Chris Nduka',         '+447911123007', 'Hooker',     '["Prop"]',                'Open',        'Unavailable', false, 'Travelling until end of month',           'chris.nduka@email.com',    '1995-08-07'),

-- LOCKS (x4)
('Alex Thornton',       '+447911123008', 'Lock',       '["Flanker"]',             'Performance', 'Active',    true,  'Lineout jumper, strong in the loose',       'alex.thornton@email.com',  '1992-12-01'),
('Ben Adeyemi',         '+447911123009', 'Lock',       '[]',                      'Performance', 'Active',    true,  '',                                          'ben.adeyemi@email.com',    '1996-04-20'),
('Patrick Lowe',        '+447911123010', 'Lock',       '["Flanker"]',             'Open',        'Active',    false, '',                                          'patrick.lowe@email.com',   '1998-06-15'),
('Greg Flanagan',       '+447911123011', 'Lock',       '[]',                      'Open',        'Injured',   false, 'Knee — return date TBC',                    'greg.flanagan@email.com',  '1991-10-28'),

-- FLANKERS (x4)
('Kai Mensah',          '+447911123012', 'Flanker',    '["Number 8"]',            'Performance', 'Active',    true,  'Openside, strong at the breakdown',         'kai.mensah@email.com',     '1995-01-09'),
('Rory McAllister',     '+447911123013', 'Flanker',    '[]',                      'Performance', 'Active',    true,  'Blindside, carries well',                   'rory.mcallister@email.com','1993-07-17'),
('Josh Freeman',        '+447911123014', 'Flanker',    '["Number 8", "Lock"]',    'Open',        'Active',    true,  '',                                          'josh.freeman@email.com',   '1997-03-22'),
('Sam Obi',             '+447911123015', 'Flanker',    '[]',                      'Open',        'Unavailable', false, 'Work commitments this month',             'sam.obi@email.com',        '2000-09-11'),

-- NUMBER 8s (x2)
('Leon Baptiste',       '+447911123016', 'Number 8',   '["Flanker"]',             'Performance', 'Active',    true,  'Ball carrier, lineout option at 8',         'leon.baptiste@email.com',  '1994-11-03'),
('Harry Singh',         '+447911123017', 'Number 8',   '["Flanker", "Lock"]',     'Open',        'Active',    false, '',                                          'harry.singh@email.com',    '2001-05-25'),

-- SCRUM-HALVES (x3)
('Finn Gallagher',      '+447911123018', 'Scrum-half', '[]',                      'Performance', 'Active',    true,  'First choice 9, quick service',             'finn.gallagher@email.com', '1996-08-30'),
('Ollie Turner',        '+447911123019', 'Scrum-half', '["Fly-half"]',            'Open',        'Active',    true,  '',                                          'ollie.turner@email.com',   '1999-12-19'),
('Declan Farrow',       '+447911123020', 'Scrum-half', '[]',                      'Open',        'Injured',   false, 'Hamstring — 2 weeks',                       'declan.farrow@email.com',  '1993-04-06'),

-- FLY-HALVES (x2)
('Nathan Cross',        '+447911123021', 'Fly-half',   '["Centre"]',              'Performance', 'Active',    true,  'Goal kicker, organises the backline',       'nathan.cross@email.com',   '1995-09-14'),
('Will Ashby',          '+447911123022', 'Fly-half',   '["Scrum-half"]',          'Open',        'Active',    false, '',                                          'will.ashby@email.com',     '2002-01-07'),

-- CENTRES (x4)
('Darius Eze',          '+447911123023', 'Centre',     '["Wing"]',                'Performance', 'Active',    true,  '12, strong defender and carrier',           'darius.eze@email.com',     '1993-06-22'),
('Michael Reeves',      '+447911123024', 'Centre',     '["Fly-half"]',            'Performance', 'Active',    true,  '13, good distribution',                     'michael.reeves@email.com', '1996-02-28'),
('Connor Hayes',        '+447911123025', 'Centre',     '[]',                      'Open',        'Active',    false, '',                                          'connor.hayes@email.com',   '1998-10-04'),
('Aiden Nwosu',         '+447911123026', 'Centre',     '["Wing"]',                'Open',        'Unavailable', false, 'On holiday',                              'aiden.nwosu@email.com',    '2000-07-16'),

-- WINGS (x4)
('Theo Lambert',        '+447911123027', 'Wing',       '["Fullback"]',            'Performance', 'Active',    true,  'Electric pace, top try scorer last season', 'theo.lambert@email.com',   '1997-05-11'),
('Isaac Osei',          '+447911123028', 'Wing',       '[]',                      'Performance', 'Active',    true,  '',                                          'isaac.osei@email.com',     '1995-03-08'),
('Luca Moretti',        '+447911123029', 'Wing',       '["Fullback", "Centre"]',  'Open',        'Active',    true,  '',                                          'luca.moretti@email.com',   '1999-11-29'),
('Jude Akintola',       '+447911123030', 'Wing',       '[]',                      'Open',        'Injured',   false, 'Ankle sprain',                              'jude.akintola@email.com',  '2001-08-03'),

-- FULLBACKS (x3)
('Owen Davies',         '+447911123031', 'Fullback',   '["Wing"]',                'Performance', 'Active',    true,  'Safe under the high ball, strong kicker',   'owen.davies@email.com',    '1992-01-17'),
('Ryan Fletcher',       '+447911123032', 'Fullback',   '["Wing", "Centre"]',      'Open',        'Active',    false, '',                                          'ryan.fletcher@email.com',  '1998-07-09'),
('Tyler Okoro',         '+447911123033', 'Fullback',   '[]',                      'Open',        'Retired',   false, 'Retired from playing, helps with coaching', 'tyler.okoro@email.com',    '1985-04-24');
