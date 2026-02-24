--
-- PostgreSQL database dump
--

\restrict 3fihVkDEqsKLhrPgOJWd2vObfg7pxTkEdyqvukdER82ygrXQ7zovja5fR1GCqr5

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: leagues; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (711, 'Segunda División', 'Chile', 'yes', '2025-12-09 11:25:29.70666', '2025-12-09 11:25:29.70666');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (319, '2. Division', 'Cyprus', 'yes', '2025-12-09 11:25:29.952118', '2025-12-09 11:25:29.952118');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (387, 'League', 'Jordan', 'yes', '2025-12-09 11:25:30.169069', '2025-12-09 11:25:30.169069');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (393, 'Premier League', 'Malta', 'yes', '2025-12-09 11:25:30.367861', '2025-12-09 11:25:30.367861');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (762, 'Premier League', 'Mauritania', 'yes', '2025-12-09 11:25:30.572012', '2025-12-09 11:25:30.572012');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (399, 'NPFL', 'Nigeria', 'yes', '2025-12-09 11:25:30.767605', '2025-12-09 11:25:30.767605');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (406, 'Professional League', 'Oman', 'yes', '2025-12-09 11:25:30.969927', '2025-12-09 11:25:30.969927');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (865, 'Liga 3', 'Portugal', 'yes', '2025-12-09 11:25:31.184557', '2025-12-09 11:25:31.184557');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (297, 'Thai League 2', 'Thailand', 'yes', '2025-12-09 11:25:31.488312', '2025-12-09 11:25:31.488312');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (303, 'Division 1', 'United-Arab-Emirates', 'yes', '2025-12-09 11:25:31.70105', '2025-12-09 11:25:31.70105');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (311, '1st Division', 'Albania', 'yes', '2025-12-09 11:26:29.83087', '2025-12-09 11:26:29.83087');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (186, 'Ligue 1', 'Algeria', 'yes', '2025-12-09 11:26:30.040092', '2025-12-09 11:26:30.040092');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (312, '1a Divisió', 'Andorra', 'yes', '2025-12-09 11:26:30.248314', '2025-12-09 11:26:30.248314');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (397, 'Girabola', 'Angola', 'yes', '2025-12-09 11:26:30.467688', '2025-12-09 11:26:30.467688');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (128, 'Liga Profesional Argentina', 'Argentina', 'yes', '2025-12-09 11:26:30.66699', '2025-12-09 11:26:30.66699');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (129, 'Primera Nacional', 'Argentina', 'yes', '2025-12-09 11:26:30.883318', '2025-12-09 11:26:30.883318');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (342, 'Premier League', 'Armenia', 'yes', '2025-12-09 11:26:31.102264', '2025-12-09 11:26:31.102264');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (188, 'A-League', 'Australia', 'yes', '2025-12-09 11:26:31.307055', '2025-12-09 11:26:31.307055');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (1202, 'Australian Championship', 'Australia', 'yes', '2025-12-09 11:26:31.534005', '2025-12-09 11:26:31.534005');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (219, '2. Liga', 'Austria', 'yes', '2025-12-09 11:26:31.746198', '2025-12-09 11:26:31.746198');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (218, 'Bundesliga', 'Austria', 'yes', '2025-12-09 11:26:31.950007', '2025-12-09 11:26:31.950007');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (419, 'Premyer Liqa', 'Azerbaijan', 'yes', '2025-12-09 11:26:32.14493', '2025-12-09 11:26:32.14493');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (417, 'Premier League', 'Bahrain', 'yes', '2025-12-09 11:26:32.326158', '2025-12-09 11:26:32.326158');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (117, '1. Division', 'Belarus', 'yes', '2025-12-09 11:26:32.513671', '2025-12-09 11:26:32.513671');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (116, 'Premier League', 'Belarus', 'yes', '2025-12-09 11:26:32.713357', '2025-12-09 11:26:32.713357');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (145, 'Challenger Pro League', 'Belgium', 'yes', '2025-12-09 11:26:32.916313', '2025-12-09 11:26:32.916313');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (144, 'Jupiler Pro League', 'Belgium', 'yes', '2025-12-09 11:26:33.116635', '2025-12-09 11:26:33.116635');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (344, 'Primera División', 'Bolivia', 'yes', '2025-12-09 11:26:33.329364', '2025-12-09 11:26:33.329364');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (412, 'Premier League', 'Botswana', 'yes', '2025-12-09 11:26:33.513816', '2025-12-09 11:26:33.513816');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (71, 'Serie A', 'Brazil', 'yes', '2025-12-09 11:26:33.700205', '2025-12-09 11:26:33.700205');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (72, 'Serie B', 'Brazil', 'yes', '2025-12-09 11:26:33.910159', '2025-12-09 11:26:33.910159');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (172, 'First League', 'Bulgaria', 'yes', '2025-12-09 11:26:34.133013', '2025-12-09 11:26:34.133013');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (566, 'Ligue A', 'Burundi', 'yes', '2025-12-09 11:26:34.347245', '2025-12-09 11:26:34.347245');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (265, 'Primera División', 'Chile', 'yes', '2025-12-09 11:26:34.548445', '2025-12-09 11:26:34.548445');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (169, 'Super League', 'China', 'yes', '2025-12-09 11:26:34.759207', '2025-12-09 11:26:34.759207');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (239, 'Primera A', 'Colombia', 'yes', '2025-12-09 11:26:34.948279', '2025-12-09 11:26:34.948279');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (240, 'Primera B', 'Colombia', 'yes', '2025-12-09 11:26:35.143421', '2025-12-09 11:26:35.143421');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (162, 'Primera División', 'Costa-Rica', 'yes', '2025-12-09 11:26:35.343327', '2025-12-09 11:26:35.343327');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (211, 'First NL', 'Croatia', 'yes', '2025-12-09 11:26:35.529481', '2025-12-09 11:26:35.529481');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (210, 'HNL', 'Croatia', 'yes', '2025-12-09 11:26:35.732189', '2025-12-09 11:26:35.732189');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (318, '1. Division', 'Cyprus', 'yes', '2025-12-09 11:26:35.936078', '2025-12-09 11:26:35.936078');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (345, 'Czech Liga', 'Czech-Republic', 'yes', '2025-12-09 11:26:36.132613', '2025-12-09 11:26:36.132613');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (346, 'FNL', 'Czech-Republic', 'yes', '2025-12-09 11:26:36.332753', '2025-12-09 11:26:36.332753');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (120, '1. Division', 'Denmark', 'yes', '2025-12-09 11:26:36.532448', '2025-12-09 11:26:36.532448');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (119, 'Superliga', 'Denmark', 'yes', '2025-12-09 11:26:36.732237', '2025-12-09 11:26:36.732237');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (242, 'Liga Pro', 'Ecuador', 'yes', '2025-12-09 11:26:36.928356', '2025-12-09 11:26:36.928356');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (233, 'Premier League', 'Egypt', 'yes', '2025-12-09 11:26:37.111353', '2025-12-09 11:26:37.111353');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (370, 'Primera Division', 'El-Salvador', 'yes', '2025-12-09 11:26:37.311749', '2025-12-09 11:26:37.311749');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (40, 'Championship', 'England', 'yes', '2025-12-09 11:26:37.497749', '2025-12-09 11:26:37.497749');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (45, 'FA Cup', 'England', 'yes', '2025-12-09 11:26:37.697403', '2025-12-09 11:26:37.697403');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (41, 'League One', 'England', 'yes', '2025-12-09 11:26:37.880555', '2025-12-09 11:26:37.880555');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (42, 'League Two', 'England', 'yes', '2025-12-09 11:26:38.074484', '2025-12-09 11:26:38.074484');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (43, 'National League', 'England', 'yes', '2025-12-09 11:26:38.280468', '2025-12-09 11:26:38.280468');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (39, 'Premier League', 'England', 'yes', '2025-12-09 11:26:38.464971', '2025-12-09 11:26:38.464971');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (329, 'Meistriliiga', 'Estonia', 'yes', '2025-12-09 11:26:38.68112', '2025-12-09 11:26:38.68112');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (363, 'Premier League', 'Ethiopia', 'yes', '2025-12-09 11:26:38.880474', '2025-12-09 11:26:38.880474');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (66, 'Coupe de France', 'France', 'yes', '2025-12-09 11:26:39.09692', '2025-12-09 11:26:39.09692');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (61, 'Ligue 1', 'France', 'yes', '2025-12-09 11:26:39.29699', '2025-12-09 11:26:39.29699');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (62, 'Ligue 2', 'France', 'yes', '2025-12-09 11:26:39.496922', '2025-12-09 11:26:39.496922');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (63, 'National 1', 'France', 'yes', '2025-12-09 11:26:39.713409', '2025-12-09 11:26:39.713409');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (327, 'Erovnuli Liga', 'Georgia', 'yes', '2025-12-09 11:26:39.930749', '2025-12-09 11:26:39.930749');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (79, '2. Bundesliga', 'Germany', 'yes', '2025-12-09 11:26:40.129765', '2025-12-09 11:26:40.129765');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (80, '3. Liga', 'Germany', 'yes', '2025-12-09 11:26:40.313214', '2025-12-09 11:26:40.313214');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (78, 'Bundesliga', 'Germany', 'yes', '2025-12-09 11:26:40.529743', '2025-12-09 11:26:40.529743');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (81, 'DFB Pokal', 'Germany', 'yes', '2025-12-09 11:26:40.830884', '2025-12-09 11:26:40.830884');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (570, 'Premier League', 'Ghana', 'yes', '2025-12-09 11:26:41.029632', '2025-12-09 11:26:41.029632');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (197, 'Super League 1', 'Greece', 'yes', '2025-12-09 11:26:41.229533', '2025-12-09 11:26:41.229533');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (494, 'Super League 2', 'Greece', 'yes', '2025-12-09 11:26:41.429371', '2025-12-09 11:26:41.429371');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (339, 'Liga Nacional', 'Guatemala', 'yes', '2025-12-09 11:26:41.629281', '2025-12-09 11:26:41.629281');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (234, 'Liga Nacional', 'Honduras', 'yes', '2025-12-09 11:26:41.829367', '2025-12-09 11:26:41.829367');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (380, 'Premier League', 'Hong-Kong', 'yes', '2025-12-09 11:26:42.010526', '2025-12-09 11:26:42.010526');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (271, 'NB I', 'Hungary', 'yes', '2025-12-09 11:26:42.226829', '2025-12-09 11:26:42.226829');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (1020, 'Calcutta Premier Division', 'India', 'yes', '2025-12-09 11:26:42.426864', '2025-12-09 11:26:42.426864');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (274, 'Liga 1', 'Indonesia', 'yes', '2025-12-09 11:26:42.63491', '2025-12-09 11:26:42.63491');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (291, 'Azadegan League', 'Iran', 'yes', '2025-12-09 11:26:42.86238', '2025-12-09 11:26:42.86238');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (542, 'Iraqi League', 'Iraq', 'yes', '2025-12-09 11:26:43.050884', '2025-12-09 11:26:43.050884');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (358, 'First Division', 'Ireland', 'yes', '2025-12-09 11:26:43.242771', '2025-12-09 11:26:43.242771');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (137, 'Coppa Italia', 'Italy', 'yes', '2025-12-09 11:26:43.434906', '2025-12-09 11:26:43.434906');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (135, 'Serie A', 'Italy', 'yes', '2025-12-09 11:26:43.634887', '2025-12-09 11:26:43.634887');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (136, 'Serie B', 'Italy', 'yes', '2025-12-09 11:26:43.829891', '2025-12-09 11:26:43.829891');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (138, 'Serie C - Girone A', 'Italy', 'yes', '2025-12-09 11:26:44.029142', '2025-12-09 11:26:44.029142');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (942, 'Serie C - Girone B', 'Italy', 'yes', '2025-12-09 11:26:44.22584', '2025-12-09 11:26:44.22584');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (943, 'Serie C - Girone C', 'Italy', 'yes', '2025-12-09 11:26:44.419161', '2025-12-09 11:26:44.419161');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (98, 'J1 League', 'Japan', 'yes', '2025-12-09 11:26:44.611337', '2025-12-09 11:26:44.611337');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (99, 'J2 League', 'Japan', 'yes', '2025-12-09 11:26:44.80282', '2025-12-09 11:26:44.80282');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (276, 'FKF Premier League', 'Kenya', 'yes', '2025-12-09 11:26:44.99511', '2025-12-09 11:26:44.99511');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (390, 'Premier League', 'Lebanon', 'yes', '2025-12-09 11:26:45.194927', '2025-12-09 11:26:45.194927');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (361, '1 Lyga', 'Lithuania', 'yes', '2025-12-09 11:26:45.402857', '2025-12-09 11:26:45.402857');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (261, 'National Division', 'Luxembourg', 'yes', '2025-12-09 11:26:45.61192', '2025-12-09 11:26:45.61192');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (371, 'First League', 'Macedonia', 'yes', '2025-12-09 11:26:45.819828', '2025-12-09 11:26:45.819828');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (372, 'Second League', 'Macedonia', 'yes', '2025-12-09 11:26:46.039746', '2025-12-09 11:26:46.039746');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (278, 'Super League', 'Malaysia', 'yes', '2025-12-09 11:26:46.245255', '2025-12-09 11:26:46.245255');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (263, 'Liga de Expansión MX', 'Mexico', 'yes', '2025-12-09 11:26:46.458269', '2025-12-09 11:26:46.458269');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (262, 'Liga MX', 'Mexico', 'yes', '2025-12-09 11:26:46.653632', '2025-12-09 11:26:46.653632');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (355, 'First League', 'Montenegro', 'yes', '2025-12-09 11:26:46.850892', '2025-12-09 11:26:46.850892');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (89, 'Eerste Divisie', 'Netherlands', 'yes', '2025-12-09 11:26:47.145396', '2025-12-09 11:26:47.145396');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (88, 'Eredivisie', 'Netherlands', 'yes', '2025-12-09 11:26:47.34532', '2025-12-09 11:26:47.34532');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (955, 'National League - National', 'New-Zealand', 'yes', '2025-12-09 11:26:47.543912', '2025-12-09 11:26:47.543912');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (407, 'Championship', 'Northern-Ireland', 'yes', '2025-12-09 11:26:47.74495', '2025-12-09 11:26:47.74495');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (104, '1. Division', 'Norway', 'yes', '2025-12-09 11:26:47.92288', '2025-12-09 11:26:47.92288');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (103, 'Eliteserien', 'Norway', 'yes', '2025-12-09 11:26:48.126861', '2025-12-09 11:26:48.126861');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (304, 'Liga Panameña de Fútbol', 'Panama', 'yes', '2025-12-09 11:26:48.328704', '2025-12-09 11:26:48.328704');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (252, 'Division Profesional - Clausura', 'Paraguay', 'yes', '2025-12-09 11:26:48.527061', '2025-12-09 11:26:48.527061');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (281, 'Primera División', 'Peru', 'yes', '2025-12-09 11:26:48.72772', '2025-12-09 11:26:48.72772');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (106, 'Ekstraklasa', 'Poland', 'yes', '2025-12-09 11:26:48.927377', '2025-12-09 11:26:48.927377');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (107, 'I Liga', 'Poland', 'yes', '2025-12-09 11:26:49.226645', '2025-12-09 11:26:49.226645');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (109, 'II Liga - East', 'Poland', 'yes', '2025-12-09 11:26:49.427305', '2025-12-09 11:26:49.427305');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (94, 'Primeira Liga', 'Portugal', 'yes', '2025-12-09 11:26:49.626879', '2025-12-09 11:26:49.626879');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (95, 'Segunda Liga', 'Portugal', 'yes', '2025-12-09 11:26:49.827155', '2025-12-09 11:26:49.827155');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (305, 'Stars League', 'Qatar', 'yes', '2025-12-09 11:26:50.027623', '2025-12-09 11:26:50.027623');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (283, 'Liga I', 'Romania', 'yes', '2025-12-09 11:26:50.226508', '2025-12-09 11:26:50.226508');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (284, 'Liga II', 'Romania', 'yes', '2025-12-09 11:26:50.427711', '2025-12-09 11:26:50.427711');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (405, 'National Soccer League', 'Rwanda', 'yes', '2025-12-09 11:26:50.626038', '2025-12-09 11:26:50.626038');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (308, 'Division 1', 'Saudi-Arabia', 'yes', '2025-12-09 11:26:50.826265', '2025-12-09 11:26:50.826265');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (307, 'Pro League', 'Saudi-Arabia', 'yes', '2025-12-09 11:26:51.026793', '2025-12-09 11:26:51.026793');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (180, 'Championship', 'Scotland', 'yes', '2025-12-09 11:26:51.392265', '2025-12-09 11:26:51.392265');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (183, 'League One', 'Scotland', 'yes', '2025-12-09 11:26:51.592288', '2025-12-09 11:26:51.592288');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (179, 'Premiership', 'Scotland', 'yes', '2025-12-09 11:26:51.802466', '2025-12-09 11:26:51.802466');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (286, 'Super Liga', 'Serbia', 'yes', '2025-12-09 11:26:52.00899', '2025-12-09 11:26:52.00899');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (368, 'Premier League', 'Singapore', 'yes', '2025-12-09 11:26:52.226469', '2025-12-09 11:26:52.226469');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (506, '2. liga', 'Slovakia', 'yes', '2025-12-09 11:26:52.443503', '2025-12-09 11:26:52.443503');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (332, 'Super Liga', 'Slovakia', 'yes', '2025-12-09 11:26:52.642086', '2025-12-09 11:26:52.642086');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (373, '1. SNL', 'Slovenia', 'yes', '2025-12-09 11:26:52.858525', '2025-12-09 11:26:52.858525');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (288, 'Premier Soccer League', 'South-Africa', 'yes', '2025-12-09 11:26:53.059369', '2025-12-09 11:26:53.059369');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (292, 'K League 1', 'South-Korea', 'yes', '2025-12-09 11:26:53.275337', '2025-12-09 11:26:53.275337');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (293, 'K League 2', 'South-Korea', 'yes', '2025-12-09 11:26:53.459743', '2025-12-09 11:26:53.459743');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (143, 'Copa del Rey', 'Spain', 'yes', '2025-12-09 11:26:53.663493', '2025-12-09 11:26:53.663493');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (140, 'La Liga', 'Spain', 'yes', '2025-12-09 11:26:53.856534', '2025-12-09 11:26:53.856534');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (435, 'Primera División RFEF - Group 1', 'Spain', 'yes', '2025-12-09 11:26:54.051027', '2025-12-09 11:26:54.051027');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (436, 'Primera División RFEF - Group 2', 'Spain', 'yes', '2025-12-09 11:26:54.26744', '2025-12-09 11:26:54.26744');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (141, 'Segunda División', 'Spain', 'yes', '2025-12-09 11:26:54.466783', '2025-12-09 11:26:54.466783');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (875, 'Segunda División RFEF - Group 1', 'Spain', 'yes', '2025-12-09 11:26:54.675619', '2025-12-09 11:26:54.675619');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (876, 'Segunda División RFEF - Group 2', 'Spain', 'yes', '2025-12-09 11:26:54.877027', '2025-12-09 11:26:54.877027');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (877, 'Segunda División RFEF - Group 3', 'Spain', 'yes', '2025-12-09 11:26:55.062186', '2025-12-09 11:26:55.062186');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (878, 'Segunda División RFEF - Group 4', 'Spain', 'yes', '2025-12-09 11:26:55.257962', '2025-12-09 11:26:55.257962');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (879, 'Segunda División RFEF - Group 5', 'Spain', 'yes', '2025-12-09 11:26:55.440742', '2025-12-09 11:26:55.440742');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (113, 'Allsvenskan', 'Sweden', 'yes', '2025-12-09 11:26:55.639132', '2025-12-09 11:26:55.639132');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (114, 'Superettan', 'Sweden', 'yes', '2025-12-09 11:26:55.832377', '2025-12-09 11:26:55.832377');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (208, 'Challenge League', 'Switzerland', 'yes', '2025-12-09 11:26:56.022004', '2025-12-09 11:26:56.022004');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (207, 'Super League', 'Switzerland', 'yes', '2025-12-09 11:26:56.223784', '2025-12-09 11:26:56.223784');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (567, 'Ligi kuu Bara', 'Tanzania', 'yes', '2025-12-09 11:26:56.42224', '2025-12-09 11:26:56.42224');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (296, 'Thai League 1', 'Thailand', 'yes', '2025-12-09 11:26:56.640386', '2025-12-09 11:26:56.640386');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (204, '1. Lig', 'Turkey', 'yes', '2025-12-09 11:26:56.84028', '2025-12-09 11:26:56.84028');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (203, 'Süper Lig', 'Turkey', 'yes', '2025-12-09 11:26:57.040239', '2025-12-09 11:26:57.040239');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (585, 'Premier League', 'Uganda', 'yes', '2025-12-09 11:26:57.256787', '2025-12-09 11:26:57.256787');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (333, 'Premier League', 'Ukraine', 'yes', '2025-12-09 11:26:57.456697', '2025-12-09 11:26:57.456697');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (301, 'Pro League', 'United-Arab-Emirates', 'yes', '2025-12-09 11:26:57.65655', '2025-12-09 11:26:57.65655');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (268, 'Primera División - Apertura', 'Uruguay', 'yes', '2025-12-09 11:26:57.856354', '2025-12-09 11:26:57.856354');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (270, 'Primera División - Clausura', 'Uruguay', 'yes', '2025-12-09 11:26:58.05657', '2025-12-09 11:26:58.05657');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (269, 'Segunda División', 'Uruguay', 'yes', '2025-12-09 11:25:31.903302', '2025-12-09 11:25:31.903302');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (253, 'Major League Soccer', 'USA', 'yes', '2025-12-09 11:26:58.458379', '2025-12-09 11:26:58.458379');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (369, 'Super League', 'Uzbekistan', 'yes', '2025-12-09 11:26:58.667141', '2025-12-09 11:26:58.667141');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (110, 'Premier League', 'Wales', 'yes', '2025-12-09 11:26:58.871202', '2025-12-09 11:26:58.871202');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (15, 'FIFA Club World Cup', 'World', 'yes', '2025-12-09 11:26:59.08896', '2025-12-09 11:26:59.08896');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (2, 'UEFA Champions League', 'World', 'yes', '2025-12-09 11:26:59.287713', '2025-12-09 11:26:59.287713');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (848, 'UEFA Europa Conference League', 'World', 'yes', '2025-12-09 11:26:59.486747', '2025-12-09 11:26:59.486747');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (3, 'UEFA Europa League', 'World', 'yes', '2025-12-09 11:26:59.687648', '2025-12-09 11:26:59.687648');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (531, 'UEFA Super Cup', 'World', 'yes', '2025-12-09 11:26:59.873652', '2025-12-09 11:26:59.873652');
INSERT INTO public.leagues (id, name, country, is_choosen, created_at, updated_at) VALUES (400, 'Super League', 'Zambia', 'yes', '2025-12-09 11:27:00.072938', '2025-12-09 11:27:00.072938');


--
-- PostgreSQL database dump complete
--

\unrestrict 3fihVkDEqsKLhrPgOJWd2vObfg7pxTkEdyqvukdER82ygrXQ7zovja5fR1GCqr5

