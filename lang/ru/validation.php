<?php

return [
    'accepted' => 'Поле :attribute должно быть принято.',
    'boolean' => 'Поле :attribute должно быть true или false.',
    'confirmed' => 'Поле :attribute не совпадает с подтверждением.',
    'email' => 'Поле :attribute должно быть действительным электронным адресом.',
    'file' => 'Поле :attribute должно быть файлом.',
    'max' => [
        'string' => 'Поле :attribute не должно превышать :max символов.',
        'file' => 'Поле :attribute не должно быть больше :max килобайт.',
    ],
    'mimes' => 'Поле :attribute должно быть файлом типа: :values.',
    'min' => [
        'string' => 'Поле :attribute должно содержать не менее :min символов.',
    ],
    'required' => 'Поле :attribute обязательно для заполнения.',
    'string' => 'Поле :attribute должно быть строкой.',
    'unique' => 'Такое значение поля :attribute уже используется.',

    'attributes' => [
        'name' => 'имя',
        'email' => 'email',
        'password' => 'пароль',
        'password_confirmation' => 'подтверждение пароля',
        'full_name' => 'Ф.И.О.',
        'organization_position' => 'место учебы или работы, должность',
        'academic_degree' => 'ученая степень, ученое звание',
        'phone' => 'телефон',
        'supervisor_full_name' => 'Ф.И.О. научного руководителя',
        'supervisor_organization_position' => 'должность научного руководителя',
        'supervisor_academic_degree' => 'степень научного руководителя',
        'report_title' => 'название доклада',
        'direction' => 'направление',
        'participation_form' => 'форма участия',
        'hotel_booking_needed' => 'бронирование гостиницы',
        'status' => 'статус',
        'moderator_comment' => 'комментарий модератора',
    ],
];
