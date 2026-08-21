import java.sql.*;

public class QueryDb {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://aws-1-ap-south-1.pooler.supabase.com:5432/postgres";
        String user = "postgres.ckzcvhljbxsskhiemiki";
        String password = "Maha@5900Akash@0706";

        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            System.out.println("Connected to the PostgreSQL server successfully.");
            
            String appSql = "SELECT id, application_number, workflow_status, current_stage, assigned_officer_id FROM applications ORDER BY id DESC";
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery(appSql)) {
                System.out.println("=== ALL APPLICATIONS ===");
                while (rs.next()) {
                    System.out.println("ID: " + rs.getLong("id") +
                            " | Num: " + rs.getString("application_number") +
                            " | Status: " + rs.getString("workflow_status") +
                            " | Stage: " + rs.getString("current_stage") +
                            " | AssignedOfficer: " + rs.getLong("assigned_officer_id"));
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
    }
}
