<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_root_serves_react_app(): void
    {
        $response = $this->get('/');

        $response
            ->assertOk()
            ->assertSee('id="root"', false);
    }
}
