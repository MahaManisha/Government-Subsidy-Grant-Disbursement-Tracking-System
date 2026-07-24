package com.gov.subsidy.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class RoleBasedAccessControlTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(username = "admin_user", roles = {"ADMIN"})
    public void testAdmin_AccessUsers_Allowed() throws Exception {
        mockMvc.perform(get("/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "beneficiary_user", roles = {"BENEFICIARY"})
    public void testBeneficiary_AccessUsers_Forbidden() throws Exception {
        mockMvc.perform(get("/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Forbidden: Access Denied"));
    }

    @Test
    @WithMockUser(username = "officer_user", roles = {"FIELD_OFFICER"})
    public void testFieldOfficer_AccessUsers_Forbidden() throws Exception {
        mockMvc.perform(get("/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Forbidden: Access Denied"));
    }

    @Test
    @WithMockUser(username = "beneficiary_user", roles = {"BENEFICIARY"})
    public void testBeneficiary_GetMyProfile_NotFound() throws Exception {
        mockMvc.perform(get("/v1/beneficiaries/me")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @WithMockUser(username = "officer_user", roles = {"FIELD_OFFICER"})
    public void testFieldOfficer_GetMyProfile_NotFound() throws Exception {
        mockMvc.perform(get("/v1/beneficiaries/me")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    public void testAnonymous_GetMyProfile_Unauthorized() throws Exception {
        mockMvc.perform(get("/v1/beneficiaries/me")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }
}
