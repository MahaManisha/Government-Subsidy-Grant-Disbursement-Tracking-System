import java.sql.*;
public class DbInspector {
    public static void main(String[] args) throws Exception {
        String url = "jdbc:postgresql://aws-1-ap-south-1.pooler.supabase.com:5432/postgres";
        String user = "postgres.ckzcvhljbxsskhiemiki";
        String password = "Maha@5900Akash@0706";
        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            System.out.println("Connected to PostgreSQL!");
            
            String query = "SELECT * FROM applications WHERE application_number = 'APP-2026-000007'";
            try (Statement stmt = conn.createStatement(); ResultSet rs = stmt.executeQuery(query)) {
                if (rs.next()) {
                    ResultSetMetaData rsmd = rs.getMetaData();
                    int columnCount = rsmd.getColumnCount();
                    System.out.println("--- Application Details ---");
                    for (int i = 1; i <= columnCount; i++) {
                        System.out.println(rsmd.getColumnName(i) + " : " + rs.getString(i));
                    }
                    long appId = rs.getLong("id");
                    System.out.println("Application ID: " + appId);

                    String disbQuery = "SELECT * FROM disbursements WHERE application_id = " + appId;
                    try (Statement stmt2 = conn.createStatement(); ResultSet rs2 = stmt2.executeQuery(disbQuery)) {
                        System.out.println("--- Disbursement Details ---");
                        while (rs2.next()) {
                            ResultSetMetaData rsmd2 = rs2.getMetaData();
                            int colCount2 = rsmd2.getColumnCount();
                            for (int i = 1; i <= colCount2; i++) {
                                System.out.println(rsmd2.getColumnName(i) + " : " + rs2.getString(i));
                            }
                        }
                    }

                    String wHistQuery = "SELECT * FROM workflow_history WHERE application_id = " + appId + " ORDER BY created_at ASC";
                    try (Statement stmt3 = conn.createStatement(); ResultSet rs3 = stmt3.executeQuery(wHistQuery)) {
                        System.out.println("--- Workflow History ---");
                        while (rs3.next()) {
                            System.out.println(rs3.getString("previous_status") + " -> " + rs3.getString("new_status") + " at " + rs3.getString("created_at") + " by " + rs3.getString("action_by"));
                        }
                    }
                } else {
                    System.out.println("Application not found");
                }
            }
        }
    }
}
