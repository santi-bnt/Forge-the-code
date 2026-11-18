import type { TestCase } from '../types';

export type Topic = 'Arrays' | 'Strings' | 'Hash Maps' | 'Two Pointers' | 'Sliding Window' | 'Binary Search' | 'Matrices' | 'Stacks' | 'Recursion';
type Example = [args: unknown[], expected: unknown];
type Definition = {
  id: string; title: string; topic: Topic; difficulty: 'Easy' | 'Medium' | 'Hard';
  day: 1 | 2 | 3; tags?: string[];
  args: string; description: string; constraints: string;
  cases: [Example, Example, Example, ...Example[]];
  hints: [string, string, string]; body: string;
  time: string; space: string; edges: string; optimization: string;
};

const definitions: Definition[] = [
  {
    id: 'stock-corrections', title: 'Stock Corrections', topic: 'Arrays', difficulty: 'Easy', day: 1, args: 'changes',
    description: 'Cada elemento es un ajuste al inventario. Devuelve el inventario inicial mínimo que impide que el saldo sea negativo en cualquier momento.',
    constraints: '0 ≤ len(changes) ≤ 100 000. Ajustes enteros entre −10⁹ y 10⁹.',
    cases: [[[[-3, 5, -6]], 4], [[[]], 0], [[[4, -2]], 0], [[[-1, -5]], 6]],
    hints: ['El saldo se acumula con cada ajuste.', 'Basta conocer la menor suma prefija.', 'saldo = mínimo = 0; para cada ajuste, acumula y actualiza mínimo; devuelve −mínimo.'],
    body: 'balance = minimum = 0\nfor change in changes:\n    balance += change\n    minimum = min(minimum, balance)\nreturn -minimum',
    time: 'O(n)', space: 'O(1)', edges: 'Un registro vacío y saldos siempre positivos requieren cero unidades.', optimization: 'Conserva el mínimo sin construir una lista de prefijos.',
  },
  {
    id: 'shelf-switches', title: 'Shelf Switches', topic: 'Arrays', difficulty: 'Easy', day: 1, args: 'shelves',
    description: 'Cuenta cuántas veces cambia el número de estante entre dos lecturas consecutivas.',
    constraints: '0 ≤ len(shelves) ≤ 100 000. Los identificadores son enteros.',
    cases: [[[[2, 2, 7, 2, 2]], 2], [[[]], 0], [[[9]], 0], [[[1, 2, 3, 4]], 3]],
    hints: ['Una transición se define usando dos lecturas.', 'Recorre índices desde el segundo elemento.', 'Si shelves[i] difiere de shelves[i−1], incrementa el contador.'],
    body: 'return sum(shelves[i] != shelves[i - 1] for i in range(1, len(shelves)))',
    time: 'O(n)', space: 'O(1)', edges: 'Con cero o una lectura no hay transiciones.', optimization: 'Usa índices o un iterador para evitar copiar la lista.',
  },
  {
    id: 'label-runs', title: 'Label Runs', topic: 'Strings', difficulty: 'Easy', day: 1, args: 'label',
    description: 'Devuelve una cadena con el primer carácter de cada grupo consecutivo de caracteres iguales.',
    constraints: '0 ≤ len(label) ≤ 100 000. Solo letras ASCII minúsculas.',
    cases: [[['aaabbbaacc'], 'abac'], [[''], ''], [['x'], 'x'], [['ababa'], 'ababa']],
    hints: ['Los grupos pueden repetir una letra más adelante.', 'Compara cada carácter con el último guardado.', 'Acumula los caracteres distintos del último y únelos al final.'],
    body: "parts = []\nfor char in label:\n    if not parts or parts[-1] != char:\n        parts.append(char)\nreturn ''.join(parts)",
    time: 'O(n)', space: 'O(n)', edges: 'La cadena vacía produce una cadena vacía.', optimization: 'Usa join para ensamblar el resultado en un solo paso.',
  },
  {
    id: 'query-inventory', title: 'Query Inventory', topic: 'Strings', difficulty: 'Easy', day: 1, args: 'query, allowed',
    description: 'Devuelve las letras distintas de query que aparecen en allowed, en el orden de su primera aparición en query.',
    constraints: 'Cada cadena tiene hasta 100 000 letras ASCII minúsculas.',
    cases: [[['cocoa', 'ac'], 'ca'], [['', 'abc'], ''], [['bbdda', 'abd'], 'bda'], [['xyz', ''], '']],
    hints: ['El orden de allowed es irrelevante.', 'Usa un conjunto de letras disponibles.', 'Al encontrar una letra disponible, agréguela al resultado y elimínala del conjunto.'],
    body: "available = set(allowed)\nparts = []\nfor char in query:\n    if char in available:\n        parts.append(char)\n        available.remove(char)\nreturn ''.join(parts)",
    tags: ['Sets'], time: 'O(n + m)', space: 'O(1) para el alfabeto fijo', edges: 'Una lista de permitidas vacía produce una cadena vacía.', optimization: 'Elimina letras ya emitidas del conjunto original.',
  },
  {
    id: 'replayed-events', title: 'Replayed Events', topic: 'Hash Maps', difficulty: 'Easy', day: 1, args: 'events',
    description: 'Devuelve los identificadores que aparecen al menos dos veces. Ordénalos por el momento en que se observó su segunda aparición.',
    constraints: '0 ≤ len(events) ≤ 100 000. Cada identificador es un entero.',
    cases: [[[[4, 7, 7, 4, 4]], [7, 4]], [[[]], []], [[[1, 2, 3]], []], [[[0, 0, 0]], [0]]],
    hints: ['El momento de la segunda aparición determina el orden.', 'Mantén frecuencias en un diccionario.', 'Aumenta el contador de cada identificador y emítelo cuando llegue a dos.'],
    body: 'counts = {}\nresult = []\nfor event in events:\n    counts[event] = counts.get(event, 0) + 1\n    if counts[event] == 2:\n        result.append(event)\nreturn result',
    time: 'O(n) esperado', space: 'O(u), u identificadores distintos', edges: 'Una tercera aparición no vuelve a emitir el identificador.', optimization: 'Emite durante el recorrido para evitar ordenar.',
  },
  {
    id: 'seller-leader', title: 'Seller Leader', topic: 'Hash Maps', difficulty: 'Medium', day: 1, args: 'sales',
    description: 'Cada venta es [seller, amount]. Devuelve el identificador con mayor importe total. En empate gana el identificador menor. Sin ventas devuelve null (None en Python).',
    constraints: '0 ≤ len(sales) ≤ 100 000. Identificadores enteros e importes entre −10⁹ y 10⁹.',
    cases: [[[[[4, 5], [2, 8], [4, 3]]], 2], [[[]], null], [[[[1, 8], [2, 2], [1, -10]]], 2], [[[[-4, -9], [2, -7]]], 2]],
    hints: ['Los importes negativos pueden cambiar el líder.', 'Acumula por identificador y luego aplica el desempate.', 'Suma amount por seller; elige el mínimo según la clave (−total, seller).'],
    body: 'totals = {}\nfor seller, amount in sales:\n    totals[seller] = totals.get(seller, 0) + amount\nreturn min(totals, key=lambda seller: (-totals[seller], seller), default=None)',
    time: 'O(n) esperado', space: 'O(u), u vendedores distintos', edges: 'Considera devoluciones, empates y totales todos negativos.', optimization: 'Explora los totales una vez sin ordenarlos.',
  },
  {
    id: 'nearby-shelves', title: 'Nearby Shelves', topic: 'Two Pointers', difficulty: 'Easy', day: 2, args: 'left, right',
    description: 'Dadas dos listas ordenadas de posiciones, devuelve la menor distancia absoluta entre una posición de cada lista. Si alguna está vacía, devuelve −1.',
    constraints: 'Listas no decrecientes de hasta 100 000 enteros cada una.',
    cases: [[[[1, 8, 12], [4, 10]], 2], [[[], [1]], -1], [[[0, 1], [1]], 0], [[[-8], [3]], 11]],
    hints: ['Observa qué ocurre si incrementas la posición mayor.', 'Usa un puntero por lista.', 'Actualiza el mínimo con la pareja actual y avanza el puntero de la posición menor.'],
    body: 'if not left or not right:\n    return -1\ni = j = 0\nbest = abs(left[0] - right[0])\nwhile i < len(left) and j < len(right):\n    best = min(best, abs(left[i] - right[j]))\n    if left[i] < right[j]:\n        i += 1\n    else:\n        j += 1\nreturn best',
    time: 'O(n + m)', space: 'O(1)', edges: 'Posiciones iguales tienen distancia cero.', optimization: 'Puedes terminar inmediatamente al ver una distancia cero.',
  },
  {
    id: 'compatible-crates', title: 'Compatible Crates', topic: 'Two Pointers', difficulty: 'Medium', day: 2, args: 'weights, limit',
    description: 'Cuenta pares de índices distintos i < j cuyos pesos suman como máximo limit. Pueden repetirse los pesos.',
    constraints: 'weights está ordenada de menor a mayor, con hasta 100 000 enteros positivos. limit es entero.',
    cases: [[[[1, 2, 2, 5], 4], 3], [[[], 5], 0], [[[2, 2, 2, 2], 4], 6], [[[4, 5], 3], 0]],
    hints: ['Con el mayor compañero válido, todos los intermedios funcionan.', 'Mantén punteros a ambos extremos.', 'Si la suma cabe, añade derecha−izquierda y avanza izquierda; si no, reduce derecha.'],
    body: 'left, right = 0, len(weights) - 1\ncount = 0\nwhile left < right:\n    if weights[left] + weights[right] <= limit:\n        count += right - left\n        left += 1\n    else:\n        right -= 1\nreturn count',
    time: 'O(n)', space: 'O(1)', edges: 'Dos pesos idénticos corresponden a índices distintos.', optimization: 'Cuenta por bloques, sin enumerar parejas.',
  },
  {
    id: 'peak-pickups', title: 'Peak Pickups', topic: 'Sliding Window', difficulty: 'Easy', day: 2, args: 'pickups, k',
    description: 'Devuelve el total máximo de recogidas en exactamente k intervalos consecutivos.',
    constraints: '1 ≤ k ≤ len(pickups) ≤ 100 000. Cada intervalo tiene entre 0 y 10⁹ recogidas.',
    cases: [[[[1, 5, 2, 7, 0], 2], 9], [[[2, 3], 2], 5], [[[0, 0, 0], 1], 0], [[[9, 1, 3], 1], 9]],
    hints: ['Las ventanas adyacentes se solapan.', 'Guarda la suma de la ventana actual.', 'Suma los primeros k; por cada avance suma el nuevo valor y resta el que salió.'],
    body: 'current = sum(pickups[i] for i in range(k))\nbest = current\nfor i in range(k, len(pickups)):\n    current += pickups[i] - pickups[i - k]\n    best = max(best, current)\nreturn best',
    time: 'O(n)', space: 'O(1)', edges: 'Con k igual a n solo hay una ventana.', optimization: 'Actualiza la suma con dos operaciones por desplazamiento.',
  },
  {
    id: 'clean-catalog', title: 'Clean Catalog Window', topic: 'Sliding Window', difficulty: 'Medium', day: 2, args: 'products, budget',
    description: 'Devuelve la longitud máxima de un segmento consecutivo con a lo sumo budget identificadores distintos.',
    constraints: '0 ≤ len(products) ≤ 100 000. Identificadores enteros y 0 ≤ budget ≤ 100 000.',
    cases: [[[[3, 1, 3, 2, 2, 1], 2], 3], [[[9], 0], 0], [[[], 2], 0], [[[1, 7, 7, 7, 1], 2], 5]],
    hints: ['Al añadir un elemento, restaura el presupuesto por la izquierda.', 'Usa conteos por identificador en la ventana.', 'Expande derecha; mientras haya demasiadas claves, decrementa y borra ceros desde izquierda; registra el tamaño.'],
    body: 'counts = {}\nleft = best = 0\nfor right, item in enumerate(products):\n    counts[item] = counts.get(item, 0) + 1\n    while len(counts) > budget:\n        outgoing = products[left]\n        counts[outgoing] -= 1\n        if counts[outgoing] == 0:\n            del counts[outgoing]\n        left += 1\n    best = max(best, right - left + 1)\nreturn best',
    time: 'O(n) esperado', space: 'O(min(u, budget + 1))', edges: 'Un presupuesto de cero solo permite un segmento vacío.', optimization: 'Cada puntero avanza como máximo n veces.',
  },
  {
    id: 'range-balance', title: 'Range Balance', topic: 'Arrays', difficulty: 'Medium', day: 2, args: 'changes, ranges',
    description: 'Para cada consulta [start, stop], devuelve la suma de changes desde start inclusive hasta stop exclusivo, en orden de consulta.',
    constraints: 'Hasta 100 000 ajustes enteros y 100 000 consultas. 0 ≤ start ≤ stop ≤ len(changes).',
    cases: [[[[2, -3, 5, 6], [[0, 2], [1, 4], [2, 2]]], [-1, 8, 0]], [[[], [[0, 0]]], [0]], [[[5, -7], []], []], [[[1, -4], [[0, 2], [1, 2]]], [-3, -4]]],
    hints: ['Comparte trabajo entre consultas que se solapan.', 'Construye sumas prefijas con un cero inicial.', 'Guarda prefix[i] = suma de los primeros i ajustes y responde prefix[stop] − prefix[start].'],
    body: 'prefix = [0]\nfor change in changes:\n    prefix.append(prefix[-1] + change)\nreturn [prefix[stop] - prefix[start] for start, stop in ranges]',
    tags: ['Prefix Sums'], time: 'O(n + q)', space: 'O(n) auxiliar', edges: 'Un intervalo vacío vale cero, incluso sobre una lista vacía.', optimization: 'El trabajo por consulta baja a O(1) tras construir los prefijos.',
  },
  {
    id: 'first-eligible-bin', title: 'First Eligible Bin', topic: 'Binary Search', difficulty: 'Easy', day: 2, args: 'capacities, order',
    description: 'Devuelve el índice del primer contenedor cuya capacidad sea al menos order, o −1 si no existe.',
    constraints: 'capacities es no decreciente y tiene hasta 100 000 enteros no negativos. order es no negativo.',
    cases: [[[[1, 4, 4, 9], 4], 1], [[[], 2], -1], [[[4, 5], 6], -1], [[[2, 3], 0], 0]],
    hints: ['Una vez que una capacidad cumple, las siguientes también.', 'Busca el límite izquierdo en un intervalo semiabierto.', 'Si el medio es demasiado pequeño, descártalo y avanza izquierda; en otro caso mueve derecha al medio.'],
    body: 'left, right = 0, len(capacities)\nwhile left < right:\n    mid = (left + right) // 2\n    if capacities[mid] < order:\n        left = mid + 1\n    else:\n        right = mid\nreturn left if left < len(capacities) else -1',
    time: 'O(log n)', space: 'O(1)', edges: 'Con duplicados se necesita el primer índice.', optimization: 'El intervalo semiabierto representa la respuesta inexistente con el índice n.',
  },
  {
    id: 'dispatch-capacity', title: 'Dispatch Capacity', topic: 'Binary Search', difficulty: 'Medium', day: 2, args: 'parcels, days',
    description: 'Encuentra la capacidad diaria mínima para despachar todos los paquetes en a lo sumo days días. Conserva el orden y cada paquete debe salir completo en un solo día.',
    constraints: '1 ≤ len(parcels) ≤ 100 000. Cada peso está entre 1 y 10⁹. 1 ≤ days ≤ len(parcels).',
    cases: [[[[3, 2, 2, 4, 1], 3], 5], [[[9], 1], 9], [[[2, 4, 3], 1], 9], [[[2, 4, 3], 3], 4]],
    hints: ['Si una capacidad funciona, una mayor también.', 'Busca sobre capacidades y comprueba con un llenado voraz.', 'Entre max y suma, evalúa el medio; inicia un día nuevo cuando el siguiente paquete no quepa.'],
    body: 'low, high = max(parcels), sum(parcels)\nwhile low < high:\n    capacity = (low + high) // 2\n    used, load = 1, 0\n    for weight in parcels:\n        if load + weight > capacity:\n            used += 1\n            load = 0\n        load += weight\n    if used <= days:\n        high = capacity\n    else:\n        low = capacity + 1\nreturn low',
    time: 'O(n log(R + 1)), R = suma − máximo', space: 'O(1)', edges: 'Un día exige la suma total. Un día por paquete permite usar el peso máximo.', optimization: 'La comprobación puede detenerse al superar days.',
  },
  {
    id: 'warehouse-border', title: 'Warehouse Border', topic: 'Matrices', difficulty: 'Easy', day: 3, args: 'grid',
    description: 'Suma las celdas del perímetro de una cuadrícula rectangular. Cada celda del borde cuenta una sola vez.',
    constraints: 'Hasta 100 000 celdas enteras. La cuadrícula es [] o tiene filas de igual longitud con al menos una columna.',
    cases: [[[[[1, 2, 3], [4, 100, 6], [7, 8, 9]]], 40], [[[]], 0], [[[[7], [3]]], 10], [[[[4, 5, 6]]], 15]],
    hints: ['El centro queda excluido.', 'Trata primera y última fila como segmentos completos.', 'Suma la primera fila; si hay más filas, suma la última y los extremos de las intermedias sin duplicar una columna.'],
    body: 'if not grid:\n    return 0\nresult = sum(grid[0])\nif len(grid) > 1:\n    result += sum(grid[-1])\n    for i in range(1, len(grid) - 1):\n        result += grid[i][0]\n        if len(grid[i]) > 1:\n            result += grid[i][-1]\nreturn result',
    time: 'O(f + c)', space: 'O(1)', edges: 'Una fila o columna es borde entero.', optimization: 'Visita solo el perímetro.',
  },
  {
    id: 'aisle-route', title: 'Aisle Route', topic: 'Matrices', difficulty: 'Hard', day: 3, args: 'grid, k',
    description: 'Desde la esquina superior izquierda, llega a la inferior derecha con el menor número de movimientos ortogonales. Entrar a una celda 1 consume un pase. Puedes gastar hasta k pases. Devuelve −1 si no hay ruta.',
    constraints: 'Matriz rectangular binaria de 1 a 40 filas y columnas. Ambas esquinas son 0. 0 ≤ k ≤ 40.',
    cases: [[[[[0, 1, 0], [0, 1, 0], [0, 0, 0]], 0], 4], [[[[0, 1, 0]], 1], 2], [[[[0, 1, 1, 0]], 1], -1], [[[[0]], 0], 0], [[[[0, 1, 0, 1, 0], [0, 0, 0, 1, 0]], 1], 5]],
    tags: ['BFS'], hints: ['La ruta más corta a una celda puede llegar con menos pases disponibles.', 'Usa BFS sobre posición y pases restantes.', 'Encola una visita si queda presupuesto y mejora el máximo de pases restantes observado en esa celda.'],
    body: 'from collections import deque\nrows, cols = len(grid), len(grid[0])\nbest = [[-1] * cols for _ in range(rows)]\nbest[0][0] = k\nqueue = deque([(0, 0, k, 0)])\nwhile queue:\n    row, col, remaining, steps = queue.popleft()\n    if (row, col) == (rows - 1, cols - 1):\n        return steps\n    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):\n        r, c = row + dr, col + dc\n        if 0 <= r < rows and 0 <= c < cols:\n            left = remaining - grid[r][c]\n            if left > best[r][c]:\n                best[r][c] = left\n                queue.append((r, c, left, steps + 1))\nreturn -1',
    time: 'O(f · c · (k + 1))', space: 'O(f · c · (k + 1)) como cota de la cola', edges: 'Una sola celda requiere cero pasos. Un camino corto puede gastar un pase necesario más adelante.', optimization: 'La dominancia por pases evita volver a encolar estados alcanzados con un presupuesto igual o peor.',
  },
  {
    id: 'restore-queue', title: 'Restore the Queue', topic: 'Stacks', difficulty: 'Easy', day: 3, args: 'actions',
    description: 'Cada acción es un nombre de producto o el token UNDO. Agrega cada producto al final y elimina el último al recibir UNDO. Ignora UNDO si no hay productos. Devuelve la lista del primero al último.',
    constraints: 'Hasta 100 000 acciones. Los nombres son cadenas no vacías distintas de UNDO.',
    cases: [[[['pen', 'ink', 'UNDO', 'pad']], ['pen', 'pad']], [[[]], []], [[['UNDO', 'a', 'UNDO', 'UNDO']], []], [[['a', 'a']], ['a', 'a']]],
    hints: ['La acción que se deshace es siempre la más reciente.', 'Una lista de Python funciona como pila.', 'Por cada token, agrega el nombre o elimina el último elemento si existe.'],
    body: "stack = []\nfor action in actions:\n    if action == 'UNDO':\n        if stack:\n            stack.pop()\n    else:\n        stack.append(action)\nreturn stack",
    time: 'O(n)', space: 'O(n)', edges: 'Puede haber varios UNDO seguidos sin productos.', optimization: 'append y pop al final evitan mover otros elementos.',
  },
  {
    id: 'next-busier-slot', title: 'Next Busier Slot', topic: 'Stacks', difficulty: 'Medium', day: 3, args: 'counts',
    description: 'Para cada intervalo, devuelve cuántas posiciones lo separan del primer intervalo posterior con más pedidos. Usa 0 si no existe.',
    constraints: '0 ≤ len(counts) ≤ 100 000. Cada conteo está entre 0 y 10⁹.',
    cases: [[[[3, 1, 1, 4, 2]], [3, 2, 1, 0, 0]], [[[]], []], [[[2, 2, 2]], [0, 0, 0]], [[[1, 2, 3]], [1, 1, 0]]],
    hints: ['Un nuevo valor puede resolver varios intervalos anteriores.', 'Guarda índices pendientes en una pila monótona.', 'Mientras el valor actual supere al de la cima, extrae el índice y registra la distancia; agrega el actual.'],
    body: 'answer = [0] * len(counts)\nstack = []\nfor i, count in enumerate(counts):\n    while stack and counts[stack[-1]] < count:\n        j = stack.pop()\n        answer[j] = i - j\n    stack.append(i)\nreturn answer',
    time: 'O(n)', space: 'O(n)', edges: 'Un conteo igual no resuelve un intervalo anterior.', optimization: 'Cada índice entra y sale de la pila como máximo una vez.',
  },
  {
    id: 'nested-shipments', title: 'Nested Shipments', topic: 'Recursion', difficulty: 'Easy', day: 3, args: 'shipment',
    description: 'Suma los pesos enteros de un envío que puede contener sublistas anidadas. Una lista vacía suma cero.',
    constraints: 'shipment es una lista de enteros no negativos y sublistas. Hasta 10 000 nodos y profundidad máxima 100.',
    cases: [[[[2, [3, [], [4]], 1]], 10], [[[]], 0], [[[[[[]]], 0]], 0], [[[[1], [2, [3]]]], 6]],
    tags: ['DFS'], hints: ['Cada subenvío se resuelve con la misma regla.', 'El caso base es un peso entero.', 'Si el nodo es entero, devuélvelo; de lo contrario suma los resultados de sus hijos.'],
    body: 'def total(node):\n    if isinstance(node, int):\n        return node\n    return sum(total(child) for child in node)\nreturn total(shipment)',
    time: 'O(n), n nodos', space: 'O(h), h profundidad', edges: 'Las sublistas vacías pueden aparecer a cualquier profundidad.', optimization: 'Un DFS iterativo con una pila de iteradores permite controlar la profundidad explícitamente.',
  },
  {
    id: 'category-trails', title: 'Category Trails', topic: 'Recursion', difficulty: 'Medium', day: 3, args: 'tree, target',
    description: 'Cada nodo es [score, children]. Cuenta los caminos de la raíz a una hoja cuyos scores suman target. El árbol vacío se representa con null.',
    constraints: 'Hasta 10 000 nodos, profundidad máxima 100. Scores enteros entre −10⁹ y 10⁹.',
    cases: [[[[4, [[-2, []], [1, [[-3, []], [2, []]]]]], 2], 2], [[null, 0], 0], [[[3, [[1, []]]], 3], 0], [[[0, []], 0], 1]],
    tags: ['DFS'], hints: ['Solo los nodos sin hijos terminan un camino.', 'Propaga la suma pendiente en un DFS.', 'Resta el score del nodo; en una hoja comprueba si queda cero; en otro caso suma los resultados de sus hijos.'],
    body: 'def visit(node, remaining):\n    score, children = node\n    remaining -= score\n    if not children:\n        return int(remaining == 0)\n    return sum(visit(child, remaining) for child in children)\nreturn visit(tree, target) if tree is not None else 0',
    time: 'O(n)', space: 'O(h), h profundidad', edges: 'Un prefijo que ya alcanzó target no cuenta si aún quedan hijos.', optimization: 'Propaga un escalar sin copiar caminos. No podes por signo porque hay scores negativos.',
  },
  {
    id: 'dispatch-order', title: 'Dispatch Order', topic: 'Arrays', difficulty: 'Medium', day: 3, args: 'orders',
    description: 'Cada orden es [id, deadline, priority]. Devuelve los identificadores ordenados por deadline ascendente y luego por priority descendente. En empate completo conserva el orden de entrada.',
    constraints: 'Hasta 100 000 órdenes con id entero único, deadline entero no negativo y priority entero.',
    cases: [[[[[8, 3, 1], [5, 1, 0], [6, 3, 4], [2, 3, 4]]], [5, 6, 2, 8]], [[[]], []], [[[[9, 2, -1], [7, 2, 0]]], [7, 9]], [[[[10, 0, 9]]], [10]]],
    tags: ['Sorting'], hints: ['El identificador solo se usa para devolver el resultado.', 'Python ofrece ordenamiento estable y acepta una clave compuesta.', 'Ordena con la clave (deadline, −priority) y proyecta el primer elemento de cada orden.'],
    body: 'return [order[0] for order in sorted(orders, key=lambda order: (order[1], -order[2]))]',
    time: 'O(n log n)', space: 'O(n)', edges: 'Dos órdenes con misma fecha y prioridad conservan su orden de entrada.', optimization: 'Una clave compuesta evita dos ordenamientos completos.',
  },
];

export const problems = definitions.map(({ cases, args, body, ...definition }) => ({
  ...definition,
  starter: `def solve(${args}):\n    pass\n`,
  solution: `def solve(${args}):\n${body.split('\n').map(line => `    ${line}`).join('\n')}\n`,
  tests: cases.map(([input, expected], index): TestCase => ({
    input: JSON.stringify(input), expected: JSON.stringify(expected), hidden: index >= 2,
  })),
}));
export type InterviewProblem = (typeof problems)[number];
export const problemById = new Map(problems.map(problem => [problem.id, problem]));
export const topics = [...new Set(problems.map(problem => problem.topic))];
