import java.sql.*;
import java.math.BigDecimal;

public class AuditDisbursement {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://aws-1-ap-south-1.pooler.supabase.com:5432/postgres";
        String user = "postgres.ckzcvhljbxsskhiemiki";
        String pass = "Maha@5900Akash@0706";

        try (Connection conn = DriverManager.getConnection(url, user, pass)) {
            System.out.println("========================================================");
            System.out.println("APPLICATION");
            System.out.println("--------------------------------------------------------");
            PreparedStatement appStmt = conn.prepareStatement("SELECT * FROM applications WHERE application_number = ?");
            appStmt.setString(1, "APP-2026-000004");
            ResultSet appRs = appStmt.executeQuery();
            long appId = -1;
            long beneficiaryId = -1;
            long schemeId = -1;
            if (appRs.next()) {
                appId = appRs.getLong("id");
                beneficiaryId = appRs.getLong("beneficiary_id");
                schemeId = appRs.getLong("scheme_id");
                System.out.println("application_id: " + appId);
                System.out.println("application_number: " + appRs.getString("application_number"));
                System.out.println("status: " + appRs.getString("workflow_status"));
                System.out.println("workflow_stage: " + appRs.getString("current_stage"));
                System.out.println("requested_amount: " + appRs.getBigDecimal("requested_amount"));
                System.out.println("approved_amount: " + appRs.getBigDecimal("approved_amount"));
                System.out.println("updated_at: " + appRs.getTimestamp("updated_at"));
            }
            
            System.out.println("\nFINANCE APPROVAL");
            System.out.println("--------------------------------------------------------");
            PreparedStatement finStmt = conn.prepareStatement("SELECT * FROM verifications WHERE application_id = ?");
            finStmt.setLong(1, appId);
            ResultSet finRs = finStmt.executeQuery();
            if (finRs.next()) {
                System.out.println("status: " + finRs.getString("status"));
                System.out.println("remarks: " + finRs.getString("remarks"));
                System.out.println("verified_date: " + finRs.getTimestamp("verified_date"));
            }

            System.out.println("\nDISBURSEMENT");
            System.out.println("--------------------------------------------------------");
            PreparedStatement disbStmt = conn.prepareStatement("SELECT * FROM disbursements WHERE application_id = ?");
            disbStmt.setLong(1, appId);
            ResultSet disbRs = disbStmt.executeQuery();
            if (disbRs.next()) {
                System.out.println("Does a disbursement record exist? YES");
                System.out.println("disbursement_id: " + disbRs.getLong("id"));
                System.out.println("application_id: " + disbRs.getLong("application_id"));
                System.out.println("beneficiary_id: " + disbRs.getLong("beneficiary_id"));
                System.out.println("scheme_id: " + disbRs.getLong("scheme_id"));
                System.out.println("amount: " + disbRs.getBigDecimal("amount"));
                System.out.println("status: " + disbRs.getString("status"));
                System.out.println("transaction_reference: " + disbRs.getString("transaction_reference"));
                System.out.println("payment_reference: " + disbRs.getString("payment_reference"));
                System.out.println("created_at: " + disbRs.getTimestamp("created_at"));
                System.out.println("released_at/completed_at: " + disbRs.getTimestamp("completed_at"));
            } else {
                System.out.println("Does a disbursement record exist? NO");
            }
            
            System.out.println("\nSCHEME");
            System.out.println("--------------------------------------------------------");
            PreparedStatement schemeStmt = conn.prepareStatement("SELECT * FROM schemes WHERE id = ?");
            schemeStmt.setLong(1, schemeId);
            ResultSet schemeRs = schemeStmt.executeQuery();
            if (schemeRs.next()) {
                System.out.println("scheme_id: " + schemeRs.getLong("id"));
                System.out.println("scheme_name: " + schemeRs.getString("name"));
                System.out.println("total_budget: " + schemeRs.getBigDecimal("budget_allocation"));
                System.out.println("remaining_budget: " + schemeRs.getBigDecimal("remaining_budget"));
            }

            System.out.println("\nWORKFLOW/AUDIT");
            System.out.println("--------------------------------------------------------");
            PreparedStatement auditStmt = conn.prepareStatement("SELECT * FROM workflow_audit_logs WHERE application_id = ? ORDER BY created_at ASC");
            auditStmt.setLong(1, appId);
            ResultSet auditRs = auditStmt.executeQuery();
            while (auditRs.next()) {
                System.out.println(auditRs.getTimestamp("created_at") + " | " + auditRs.getString("event") + " | " + auditRs.getString("from_status") + " -> " + auditRs.getString("to_status"));
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
