package com.gov.subsidy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class DbAudit {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://aws-1-ap-south-1.pooler.supabase.com:5432/postgres";
        String user = "postgres.ckzcvhljbxsskhiemiki";
        String pass = "Maha@5900Akash@0706";
        
        try (Connection conn = DriverManager.getConnection(url, user, pass)) {
            System.out.println("========================================================");
            System.out.println("MANDATORY DATABASE AUDIT for APP-2026-000004");
            System.out.println("========================================================");
            
            // 1. Application Info
            String appQuery = "SELECT id, workflow_status, current_stage, beneficiary_id, eligibility_score, eligibility_result FROM applications WHERE application_number = 'APP-2026-000004'";
            long appId = -1;
            long benId = -1;
            try (PreparedStatement stmt = conn.prepareStatement(appQuery);
                 ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    appId = rs.getLong("id");
                    benId = rs.getLong("beneficiary_id");
                    System.out.println("Application ID: " + appId);
                    System.out.println("Application Status: " + rs.getString("workflow_status"));
                    System.out.println("Workflow Stage: " + rs.getString("current_stage"));
                    System.out.println("Beneficiary ID: " + benId);
                    System.out.println("Eligibility Score: " + rs.getDouble("eligibility_score"));
                    System.out.println("Eligibility Result: " + rs.getString("eligibility_result"));
                } else {
                    System.out.println("Application not found.");
                    return;
                }
            }
            
            // 2. Beneficiary Info
            String benQuery = "SELECT user_id FROM beneficiaries WHERE id = ?";
            long userId = -1;
            try (PreparedStatement stmt = conn.prepareStatement(benQuery)) {
                stmt.setLong(1, benId);
                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        userId = rs.getLong("user_id");
                        System.out.println("Beneficiary User ID: " + userId);
                    }
                }
            }
            
            // 3. User Info (Beneficiary)
            String userQuery = "SELECT first_name, last_name, username FROM users WHERE id = ?";
            try (PreparedStatement stmt = conn.prepareStatement(userQuery)) {
                stmt.setLong(1, userId);
                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        System.out.println("Beneficiary Name: " + rs.getString("first_name") + " " + rs.getString("last_name"));
                    }
                }
            }
            
            // 4. Eligibility Record
            String elQuery = "SELECT id, total_score, eligibility_result, created_at, updated_at FROM eligibility_records WHERE application_id = ?";
            try (PreparedStatement stmt = conn.prepareStatement(elQuery)) {
                stmt.setLong(1, appId);
                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        System.out.println("Eligibility Record ID: " + rs.getLong("id"));
                        System.out.println("Eligibility Record Score: " + rs.getDouble("total_score"));
                        System.out.println("Eligibility Record Result: " + rs.getString("eligibility_result"));
                        System.out.println("Eligibility Record created_at: " + rs.getTimestamp("created_at"));
                        System.out.println("Eligibility Record updated_at: " + rs.getTimestamp("updated_at"));
                    }
                }
            }
            
            // 5. Verification Records
            String verQuery = "SELECT id, status, stage, officer_id, verified_date FROM verifications WHERE application_id = ?";
            try (PreparedStatement stmt = conn.prepareStatement(verQuery)) {
                stmt.setLong(1, appId);
                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        System.out.println("Verification Record ID: " + rs.getLong("id") + " | Stage: " + rs.getString("stage") + " | Status: " + rs.getString("status") + " | Officer ID: " + rs.getLong("officer_id"));
                    }
                }
            }
            
            // 6. Finance Officer Details
            String foQuery = "SELECT u.id, u.username, u.first_name, u.last_name, r.name as role_name FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE r.name = 'ROLE_FINANCE_OFFICER'";
            try (PreparedStatement stmt = conn.prepareStatement(foQuery);
                 ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    System.out.println("Finance Officer User ID: " + rs.getLong("id"));
                    System.out.println("Finance Officer Name: " + rs.getString("first_name") + " " + rs.getString("last_name"));
                    System.out.println("Finance Officer Role: " + rs.getString("role_name"));
                    System.out.println("Finance Officer Username: " + rs.getString("username"));
                }
            }
            
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
