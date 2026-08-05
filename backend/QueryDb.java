import java.sql.*;

public class QueryDb {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://aws-1-ap-south-1.pooler.supabase.com:5432/postgres";
        String user = "postgres.ckzcvhljbxsskhiemiki";
        String password = "Maha@5900Akash@0706";

        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            System.out.println("Connected to the PostgreSQL server successfully.");
            
            String appSql = "SELECT id, application_number, workflow_status, current_stage, eligibility_score, eligibility_result, rejection_reason, assigned_officer_id FROM applications WHERE application_number = 'APP-2026-000004'";
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery(appSql)) {
                if (rs.next()) {
                    long appId = rs.getLong("id");
                    System.out.println("Application ID: " + appId);
                    System.out.println("Status: " + rs.getString("workflow_status"));
                    System.out.println("Stage: " + rs.getString("current_stage"));
                    System.out.println("Score: " + rs.getInt("eligibility_score"));
                    System.out.println("Eligibility Result: " + rs.getString("eligibility_result"));
                    System.out.println("Rejection Reason: " + rs.getString("rejection_reason"));
                    System.out.println("Assigned Officer ID: " + rs.getLong("assigned_officer_id"));

                    String verSql = "SELECT id, status, remarks FROM verifications WHERE application_id = " + appId;
                    try (ResultSet vrs = conn.createStatement().executeQuery(verSql)) {
                        if (vrs.next()) {
                            System.out.println("Verification ID: " + vrs.getLong("id") + ", Status: " + vrs.getString("status") + ", Remarks: " + vrs.getString("remarks"));
                        } else {
                            System.out.println("No Verification record found.");
                        }
                    }

                    String auditSql = "SELECT action, previous_status, new_status, remarks FROM workflow_audit_logs WHERE application_id = " + appId + " ORDER BY occurred_at ASC";
                    try (ResultSet ars = conn.createStatement().executeQuery(auditSql)) {
                        while (ars.next()) {
                            System.out.println("Audit Log - Action: " + ars.getString("action") + 
                                ", Prev: " + ars.getString("previous_status") + 
                                ", New: " + ars.getString("new_status") + 
                                ", Remarks: " + ars.getString("remarks"));
                        }
                    }
                } else {
                    System.out.println("Application APP-2026-000004 not found.");
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
    }
}
