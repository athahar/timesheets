CREATE TRIGGER update_trackpay_requests_updated_at BEFORE UPDATE ON trackpay_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_trackpay_sessions_person_hours BEFORE INSERT OR UPDATE ON trackpay_sessions FOR EACH ROW EXECUTE FUNCTION trackpay_sessions_person_hours_default();

CREATE TRIGGER update_trackpay_sessions_updated_at BEFORE UPDATE ON trackpay_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_set_display_name_from_email BEFORE INSERT OR UPDATE ON trackpay_users FOR EACH ROW EXECUTE FUNCTION set_display_name_from_email();

CREATE TRIGGER update_trackpay_users_updated_at BEFORE UPDATE ON trackpay_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

