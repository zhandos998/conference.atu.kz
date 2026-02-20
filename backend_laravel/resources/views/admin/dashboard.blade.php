<!doctype html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>РџР°РЅРµР»СЊ РјРѕРґРµСЂР°С‚РѕСЂР°</title>
    <style>
        body { font-family: Arial, sans-serif; background: #e5e7eb; margin: 0; }
        .container { max-width: 1400px; margin: 24px auto; background: #fff; border-radius: 12px; padding: 16px; }
        .top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        h1 { margin: 0; color: #21397D; }
        .actions { display: flex; gap: 8px; }
        .btn { border: 0; border-radius: 8px; padding: 8px 12px; cursor: pointer; font-weight: 700; }
        .btn-primary { background: #21397D; color: #fff; text-decoration: none; }
        .btn-light { background: #e2e8f0; color: #0f172a; }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 1500px; }
        th, td { border-bottom: 1px solid #e2e8f0; padding: 8px; text-align: left; vertical-align: top; }
        th { color: #21397D; }
        select, textarea { width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; }
        .status { padding: 4px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; }
        .pending { background: #e2e8f0; }
        .accepted { background: #dcfce7; color: #166534; }
        .revision { background: #fef3c7; color: #92400e; }
        .rejected { background: #fee2e2; color: #991b1b; }
        .alert { margin: 8px 0; padding: 10px; background: #dcfce7; border-radius: 8px; color: #166534; }
        .filter { margin-bottom: 12px; display: flex; gap: 8px; align-items: center; }
        .payment-ok { color: #166534; font-weight: 700; }
        .payment-miss { color: #991b1b; font-weight: 700; }
    </style>
</head>
<body>
    @php
        $statusLabels = [
            'pending' => 'РќР° СЂР°СЃСЃРјРѕС‚СЂРµРЅРёРё',
            'accepted' => 'РџСЂРёРЅСЏС‚Рѕ',
            'revision' => 'РќР° РґРѕСЂР°Р±РѕС‚РєСѓ',
            'rejected' => 'РћС‚РєР»РѕРЅРµРЅРѕ',
        ];
    @endphp

    <div class="container">
        <div class="top">
            <h1>РџР°РЅРµР»СЊ РјРѕРґРµСЂР°С‚РѕСЂР°</h1>
            <div class="actions">
                <a class="btn btn-primary" href="{{ route('admin.export') }}">Р­РєСЃРїРѕСЂС‚ РІ Excel</a>
                <form method="POST" action="{{ route('admin.logout') }}">@csrf<button class="btn btn-light" type="submit">Р’С‹Р№С‚Рё</button></form>
            </div>
        </div>

        @if(session('success'))
            <div class="alert">{{ session('success') }}</div>
        @endif

        <form class="filter" method="GET" action="{{ route('admin.dashboard') }}">
            <label for="status">Р¤РёР»СЊС‚СЂ:</label>
            <select id="status" name="status">
                <option value="" @selected($status==='')>Р’СЃРµ</option>
                <option value="pending" @selected($status==='pending')>РќР° СЂР°СЃСЃРјРѕС‚СЂРµРЅРёРё</option>
                <option value="accepted" @selected($status==='accepted')>РџСЂРёРЅСЏС‚Рѕ</option>
                <option value="revision" @selected($status==='revision')>РќР° РґРѕСЂР°Р±РѕС‚РєСѓ</option>
                <option value="rejected" @selected($status==='rejected')>РћС‚РєР»РѕРЅРµРЅРѕ</option>
            </select>
            <button type="submit" class="btn btn-light">РџСЂРёРјРµРЅРёС‚СЊ</button>
        </form>

        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>в„–</th>
                        <th>Email</th>
                        <th>РќРѕРјРµСЂ С‚РµР»РµС„РѕРЅР°</th>
                        <th>РќР°Р·РІР°РЅРёРµ РґРѕРєР»Р°РґР°</th>
                        <th>РђРІС‚РѕСЂС‹</th>
                        <th>РЈС‡РµРЅР°СЏ СЃС‚РµРїРµРЅСЊ, СѓС‡РµРЅРѕРµ Р·РІР°РЅРёРµ, РґРѕР»Р¶РЅРѕСЃС‚СЊ</th>
                        <th>РќР°РїСЂР°РІР»РµРЅРёРµ</th>
                        <th>РќР°СѓС‡РЅС‹Р№ СЂСѓРєРѕРІРѕРґРёС‚РµР»СЊ</th>
                        <th>Р”РѕР»Р¶РЅРѕСЃС‚СЊ РЅР°СѓС‡РЅРѕРіРѕ СЂСѓРєРѕРІРѕРґРёС‚РµР»СЏ</th>
                        <th>РЎС‚РµРїРµРЅСЊ РЅР°СѓС‡РЅРѕРіРѕ СЂСѓРєРѕРІРѕРґРёС‚РµР»СЏ</th>
                        <th>Р¤РѕСЂРјР° СѓС‡Р°СЃС‚РёСЏ</th>
                        <th>Р‘СЂРѕРЅРёСЂРѕРІР°РЅРёРµ РіРѕСЃС‚РёРЅРёС†С‹</th>
                        <th>РћРїР»Р°С‚Р°</th>
                        <th>РџРѕРґРїРёСЃСЊ</th>
                        <th>РЎС‚Р°С‚СѓСЃ</th>
                        <th>РњРѕРґРµСЂР°С†РёСЏ</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($applications as $app)
                        <tr>
                            <td>{{ $app->id }}</td>
                            <td>{{ $app->email }}</td>
                            <td>{{ $app->phone }}</td>
                            <td>{{ $app->report_title }}</td>
                            <td>{{ $app->full_name }}</td>
                            <td>{{ $app->academic_degree }}, {{ $app->organization_position }}</td>
                            <td>{{ $app->direction }}</td>
                            <td>{{ $app->supervisor_full_name }}</td>
                            <td>{{ $app->supervisor_organization_position }}</td>
                            <td>{{ $app->supervisor_academic_degree }}</td>
                            <td>{{ $app->participation_form }}</td>
                            <td>{{ $app->hotel_booking_needed ? 'Р”Р°' : 'РќРµС‚' }}</td>
                            <td>
                                @if($app->payment_receipt_path)
                                    <span class="payment-ok">Р§РµРє Р·Р°РіСЂСѓР¶РµРЅ</span>
                                @else
                                    <span class="payment-miss">Р§РµРєР° РЅРµС‚</span>
                                @endif
                            </td>
                            <td></td>
                            <td><span class="status {{ $app->status }}">{{ $statusLabels[$app->status] ?? $app->status }}</span></td>
                            <td>
                                <form method="POST" action="{{ route('admin.applications.update', $app) }}">
                                    @csrf
                                    @method('PATCH')
                                    <select name="status" required>
                                        <option value="accepted">РџСЂРёРЅСЏС‚Рѕ</option>
                                        <option value="revision">РќР° РґРѕСЂР°Р±РѕС‚РєСѓ</option>
                                        <option value="rejected">РћС‚РєР»РѕРЅРµРЅРѕ</option>
                                    </select>
                                    <textarea name="moderator_comment" rows="2" placeholder="РљРѕРјРјРµРЅС‚Р°СЂРёР№ РјРѕРґРµСЂР°С‚РѕСЂР°">{{ $app->moderator_comment }}</textarea>
                                    <button class="btn btn-primary" type="submit">РЎРѕС…СЂР°РЅРёС‚СЊ</button>
                                </form>
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="16">РђРЅРєРµС‚С‹ РЅРµ РЅР°Р№РґРµРЅС‹.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        {{ $applications->links() }}
    </div>
</body>
</html>
