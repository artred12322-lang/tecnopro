<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$db = new SQLite3('database.sqlite');

$db->exec("
    CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        model TEXT,
        service TEXT,
        message TEXT,
        status TEXT DEFAULT 'new',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
");

$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'];

// GET /api/requests
if ($method === 'GET' && strpos($uri, '/api/requests') !== false) {
    $result = $db->query("SELECT * FROM requests ORDER BY created_at DESC");
    $rows = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $rows[] = $row;
    }
    echo json_encode($rows);
    exit();
}

// POST /api/request
if ($method === 'POST' && strpos($uri, '/api/request') !== false) {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    $type = $data['type'] ?? 'repair';
    $name = $data['name'] ?? '';
    $phone = $data['phone'] ?? '';
    $email = $data['email'] ?? '';
    $model = $data['model'] ?? '';
    $service = $data['service'] ?? '';
    $message = $data['message'] ?? '';
    
    if (empty($name) || empty($phone)) {
        http_response_code(400);
        echo json_encode(['error' => 'Имя и телефон обязательны']);
        exit();
    }
    
    $stmt = $db->prepare("
        INSERT INTO requests (type, name, phone, email, model, service, message, status)
        VALUES (:type, :name, :phone, :email, :model, :service, :message, 'new')
    ");
    $stmt->bindValue(':type', $type);
    $stmt->bindValue(':name', $name);
    $stmt->bindValue(':phone', $phone);
    $stmt->bindValue(':email', $email);
    $stmt->bindValue(':model', $model);
    $stmt->bindValue(':service', $service);
    $stmt->bindValue(':message', $message);
    $stmt->execute();
    
    $id = $db->lastInsertRowID();
    echo json_encode(['success' => true, 'id' => $id]);
    exit();
}

// PUT /api/request/123
if ($method === 'PUT' && preg_match('/\/api\/request\/(\d+)/', $uri, $matches)) {
    $id = $matches[1];
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    $status = $data['status'] ?? 'new';
    
    $stmt = $db->prepare("UPDATE requests SET status = :status WHERE id = :id");
    $stmt->bindValue(':status', $status);
    $stmt->bindValue(':id', $id);
    $stmt->execute();
    
    echo json_encode(['success' => true]);
    exit();
}

// DELETE /api/request/123
if ($method === 'DELETE' && preg_match('/\/api\/request\/(\d+)/', $uri, $matches)) {
    $id = $matches[1];
    
    $stmt = $db->prepare("DELETE FROM requests WHERE id = :id");
    $stmt->bindValue(':id', $id);
    $stmt->execute();
    
    echo json_encode(['success' => true]);
    exit();
}

http_response_code(404);
echo json_encode(['error' => 'Not found']);
