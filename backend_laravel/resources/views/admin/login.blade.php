<!doctype html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Вход в админ-панель</title>
    <style>
        body { font-family: Arial, sans-serif; background: #e5e7eb; margin: 0; }
        .wrap { max-width: 420px; margin: 10vh auto; background: #fff; padding: 20px; border-radius: 12px; }
        h1 { margin-top: 0; color: #21397D; }
        label { display: block; margin-top: 12px; font-weight: 700; }
        input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; }
        button { margin-top: 16px; padding: 10px 14px; border: 0; border-radius: 8px; background: #21397D; color: #fff; cursor: pointer; }
        .error { color: #b91c1c; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="wrap">
        <h1>Вход модератора</h1>
        <form method="POST" action="{{ route('admin.login.submit') }}">
            @csrf
            <label>Email</label>
            <input type="email" name="email" value="{{ old('email') }}" required>
            <label>Пароль</label>
            <input type="password" name="password" required>
            @error('email')<div class="error">{{ $message }}</div>@enderror
            <button type="submit">Войти</button>
        </form>
    </div>
</body>
</html>
