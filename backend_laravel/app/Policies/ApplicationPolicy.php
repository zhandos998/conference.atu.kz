<?php

namespace App\Policies;

use App\Models\Application;
use App\Models\User;

class ApplicationPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Application $application): bool
    {
        return $user->isModerator() || $application->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasVerifiedEmail();
    }

    public function update(User $user, Application $application): bool
    {
        return $application->user_id === $user->id && $application->status === Application::STATUS_REVISION;
    }

    public function moderate(User $user): bool
    {
        return $user->isModerator();
    }
}
