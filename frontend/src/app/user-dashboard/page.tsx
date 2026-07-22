import UserDashboardLayout from '@/components/user/UserDashboardLayout';

export default function UserDashboard() {
  return (
    <UserDashboardLayout role="user">
      <h1 className="text-3xl font-bold mb-8">Welcome to Your Dashboard</h1>
      <p className="text-lg text-gray-600">
        Here you can manage your submissions, update your profile, and more.
      </p>
      {/* Add stats, recent submissions, etc. */}
    </UserDashboardLayout>
  );
}