import { Route, Routes } from "react-router-dom";
import { PublicLayout } from "@/layouts/PublicLayout";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { RoleRoute } from "@/components/common/RoleRoute";

import LandingPage from "@/pages/LandingPage";
import BecomePartnerPage from "@/pages/BecomePartnerPage";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import NotFoundPage from "@/pages/NotFoundPage";

import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";

import SearchPage from "@/pages/search/SearchPage";
import StorageDetailsPage from "@/pages/storage/StorageDetailsPage";

import BookingFlowPage from "@/pages/booking/BookingFlowPage";
import PaymentPage from "@/pages/booking/PaymentPage";
import BookingDetailsPage from "@/pages/booking/BookingDetailsPage";
import BookingQrPage from "@/pages/booking/BookingQrPage";
import MyBookingsPage from "@/pages/booking/MyBookingsPage";
import ProfilePage from "@/pages/ProfilePage";

import { PartnerLayout } from "@/pages/partner/PartnerLayout";
import PartnerDashboardPage from "@/pages/partner/PartnerDashboardPage";
import PartnerStoragePage from "@/pages/partner/PartnerStoragePage";
import PartnerStorageFormPage from "@/pages/partner/PartnerStorageFormPage";
import PartnerBookingsPage from "@/pages/partner/PartnerBookingsPage";
import PartnerCheckInPage from "@/pages/partner/PartnerCheckInPage";
import PartnerRevenuePage from "@/pages/partner/PartnerRevenuePage";
import PartnerApplyPage from "@/pages/partner/PartnerApplyPage";
import PartnerApplicationsPage from "@/pages/partner/PartnerApplicationsPage";

import { AdminLayout } from "@/pages/admin/AdminLayout";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminPartnersPage from "@/pages/admin/AdminPartnersPage";
import AdminStoragePage from "@/pages/admin/AdminStoragePage";
import AdminApplicationsPage from "@/pages/admin/AdminApplicationsPage";
import AdminApplicationDetailPage from "@/pages/admin/AdminApplicationDetailPage";
import AdminBookingsPage from "@/pages/admin/AdminBookingsPage";
import AdminPaymentsPage from "@/pages/admin/AdminPaymentsPage";
import AdminReviewsPage from "@/pages/admin/AdminReviewsPage";
import AdminReportsPage from "@/pages/admin/AdminReportsPage";
import AdminPayoutsPage from "@/pages/admin/AdminPayoutsPage";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/become-partner" element={<BecomePartnerPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/search" element={<SearchPage />} />
        <Route path="/storage/:id" element={<StorageDetailsPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/book/:id" element={<BookingFlowPage />} />
          <Route path="/payment/:id" element={<PaymentPage />} />
          <Route path="/booking/:id" element={<BookingDetailsPage />} />
          <Route path="/booking/:id/qr" element={<BookingQrPage />} />
          <Route path="/bookings" element={<MyBookingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<RoleRoute allow={["PARTNER"]} />}>
        <Route element={<PartnerLayout />}>
          <Route path="/partner/dashboard" element={<PartnerDashboardPage />} />
          <Route path="/partner/storage" element={<PartnerStoragePage />} />
          <Route path="/partner/storage/new" element={<PartnerStorageFormPage />} />
          <Route path="/partner/storage/:id/edit" element={<PartnerStorageFormPage />} />
          <Route path="/partner/bookings" element={<PartnerBookingsPage />} />
          <Route path="/partner/check-in" element={<PartnerCheckInPage />} />
          <Route path="/partner/revenue" element={<PartnerRevenuePage />} />
          <Route path="/partner/apply" element={<PartnerApplyPage />} />
          <Route path="/partner/applications" element={<PartnerApplicationsPage />} />
        </Route>
      </Route>

      <Route element={<RoleRoute allow={["ADMIN"]} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/partners" element={<AdminPartnersPage />} />
          <Route path="/admin/storage" element={<AdminStoragePage />} />
          <Route path="/admin/applications" element={<AdminApplicationsPage />} />
          <Route path="/admin/applications/:id" element={<AdminApplicationDetailPage />} />
          <Route path="/admin/bookings" element={<AdminBookingsPage />} />
          <Route path="/admin/payments" element={<AdminPaymentsPage />} />
          <Route path="/admin/reviews" element={<AdminReviewsPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/payouts" element={<AdminPayoutsPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
