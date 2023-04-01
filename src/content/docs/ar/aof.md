---
title: "كتابة البيانات علي الـDisk"
description: ""
---



بسم الله الرحمن الرحيم

في الاجزاء اللي فاتت احنا عملنا فيها InMemory Database و ظبطناها انها تبقي Redis compatible عن طريق الـ RESP protocol.

الجزء ده احنا هنطبق فيه علي الـ data persistence ودي فيتشر مهمة اي قاعدة بيانات بتحتاجها حتي لو InMemory لان فيه حالات كتير
انت تقدر تستخدم الmemory علشان تعمل عمليات مختلفه علي البيانات. لكن بردو ان الـ tool تقدر تديلك durability عن طريق انها تخزن البيانات
علي الdisk علشان لو حصل اي crash or server restart يبقي انت مضيعتش البيانات دي ده مهم.

جزء الـ Persistence ده واسع جدا و بيختلف حسب الطريقه اللي هتخزن بيها البيانات و هتعمل ده ازاي. مثلا الـSQL databases زي SQLite و MySQL
مينفعش record واحد يضيع باي شكل من الاشكال. و الكود بتاع الجزء دي معقد جدا علشان يضمنلك كل ده.

و نفس الحال مع Redis. فيه طرق مختلفه انك تسجل البيانات دي علي حسب الحاله بتاعتك

- RDB (Redis Database): و دي بتبقي عباره عن snapshot من البيانات بيتم انشاءها كل فتره زمنيه محدده حسب الـconfig. زي مثلا كل ٣ دقائق او كل ١٠ دقائق حسب انت هتظبطها ازاي. و اللي بيحصل فيها ان Redis بياخد نسخه كامله من البيانات اللي في الـ memory ويحفظها في file. ولما يحصل restart او crash بيتم اعاده تحميل البيانات من الـ RDB file.

- AOF (Append only file): واللي بيحصل فيها ان Redis مع كل command بيسجله في الـ file كـ Resp ولما يحصل restart بيقوم Redis ياخد كل RESP commands من الـ AOF file ويعملها علي الـ memory.


ف الطريقة اللي احنا هنستخدمها و اللي هي سهله لاننا هنقدر نربطها بالـ RESP struct اللي عملناه. اننا كل ما نيجي ننفذ كوماند هنسجل الresp بتاعه في الfile .. ولما السيرفر/الكود عندنا يبدا يشتغل، هيقرا من ال ملف ال aof و يبعت الcommands دي تاني للـ reader و هيعملها علي الـ memory.

قبل ما نبدا، خليني اوضحلك ان شكل الـ AOF file هيكون كدا:

لو احنا عملنا 2 comamnds


```go
> set name ahmed
> set website ahmedash95.github.io
```


ف محتوي الملف هيكون


```go
*2
$3
set
$4
name
*3
$3
set
$4
name
$5
ahmed
*3
$3
set
$7
website
$20
ahmedash95.github.io
```


اعتقد ان بقي سهل عليك تقرا الـ RESP protocol و تفهمها. بسبب تطبيقنا عليه في الاجزاء اللي فاتت.

## كتابة الـ AOF struct

اول خطوه هنعملها اننا هنعمل ملف aof.go وهيبقي فيه كل الكود الخاص بالـ AOF.

- اولا هنعمل Aof struct وده هيبقي فيه الـ file اللي هيبقي علي الdisk. و bufio reader علشان نقرا الـRESP commands من الـ file.


```go
type Aof struct {
	file *os.File
	rd   *bufio.Reader
	mu   sync.Mutex
}
```


بعدين هنعمل ميثود الـ NewAof علشان نستخدمها في الـ main.go اول ما السيرفر يبدا يشتغل.


```go
func NewAof(path string) (*Aof, error) {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0666)
	if err != nil {
		return nil, err
	}

	aof := &Aof{
		file: f,
		rd:   bufio.NewReader(f),
	}

	// start go routine to sync aof to disk every 1 second
	go func() {
		for {
			aof.mu.Lock()

			aof.file.Sync()

			aof.mu.Unlock()

			time.Sleep(time.Second)
		}
	}()

	return aof, nil
}
```


- اللي بيحصل هنا اننا في اول خطوه بنعمل الـ file لو مش موجود. او نفتحه لو موجود
- بعدين بنعمل الـ bufio reader علشان نقرا من الـ file
- بنعمل go routine علشان طول ما السيرفر شغال. هتسجل الـ AOF file كل ١ ثانيه علي الـ disk. فكره اننا نعمل sync كل ثانيه ده بيضمن
ان التغييرات اللي عملناها موجوده علي الـ disk. لان من غير الsync الموضوع هيبقي ف ايد الOS انه يقرر امتي هيعمل flush للملف ده علي الـdisk.


بالشكل ده احنا ضامنين ان الـ data هتفضل دايما موجوده حتي لو حصل crash. و لو فقدنا اي بيانات هتبقي بس خلال الثانيه اللي حصل فيها الـ crash
ودي نسبه مقبوله.

لو عاوز 100% durability. ساعتها مش هنحتاج ال goroutine. و هنعمل sync للـ file كل ما نعمل command. بس الـ performance عند ال writes
هتبقي سيئه لان  IO عمليه مكلفه.


 الميثود اللي بعد كدا هي Close ودي علشان نضمن ان ال file هيتقفل بشكل سليم لما السيرفر يتقفل


```go
func (aof *Aof) Close() error {
	aof.mu.Lock()
	defer aof.mu.Unlock()

	return aof.file.Close()
}
```



بعد كدا هنعمل ميثود الـ Write. ودي اللي هستخدمها علشان نكتب ال command علي ال file كل ما يجيلنا request من الـ Client


```go
func (aof *Aof) Write(value Value) error {
	aof.mu.Lock()
	defer aof.mu.Unlock()

	_, err := aof.file.Write(value.Marshal())
	if err != nil {
		return err
	}

	return nil
}
```


لاحظ اننا استخدمنا `v.Marshal()` علشان نسجل الـ command علي الفايل زي ما الـResp بيبعتهولنا.  علشان لما نيجي نقرا الfile ده بعد كدا
نقدر نقرا الـ resp lines دي و نعملها parse و نكتبها تاني ف ال memory.

## كتابة الـ AOF

كل اللي احنا محتاجين نعمله اننا نستخدم ال NewAof في main.go و معل ريكوست من الـ client نعمل write للـ AOF file


```go
func main() {
	fmt.Println("Listening on port :6379")

	// Create a new server
	l, err := net.Listen("tcp", ":6379")
	if err != nil {
		fmt.Println(err)
		return
	}

	aof, err := NewAof("database.aof")
	if err != nil {
		fmt.Println(err)
		return
	}
	defer aof.Close()

	// Listen for connections
	conn, err := l.Accept()
	if err != nil {
		fmt.Println(err)
		return
	}

	defer conn.Close()

	for {
		resp := NewResp(conn)
		value, err := resp.Read()
		if err != nil {
			fmt.Println(err)
			return
		}

		if value.typ != "array" {
			fmt.Println("Invalid request, expected array")
			continue
		}

		if len(value.array) == 0 {
			fmt.Println("Invalid request, expected array length > 0")
			continue
		}

		command := strings.ToUpper(value.array[0].bulk)
		args := value.array[1:]

		writer := NewWriter(conn)

		handler, ok := Handlers[command]
		if !ok {
			fmt.Println("Invalid command: ", command)
			writer.Write(Value{typ: "string", str: ""})
			continue
		}

		if command == "SET" || command == "HSET" {
			aof.Write(value)
		}

		result := handler(args)
		writer.Write(result)
	}
}
```


لاحظ اننا في السطر 57 بنكتب الcommands اللي بتعمل set بس .. لان اي اوامر تانيه زي get, hget, و HGETALL مش هتحتاج نخزنها
و مش هتفرق معانا في حاجه غير انها هتزود حجم الـ AOF file.

دلوقتي لو شغلنا السيرفر وعملنا كوماند مثلا


```bash
set name ahmed
```


هنلاقي ان الـ`database.aof` فيه المحتوي التالي


```bash
*3
$3
set
$4
name
$5
ahmed
```



وكدا يبقي جزء الـ Write خلص و بقينا بنكتب الـ commands في الـ AOF file.

## قراءة الـ AOF

احنا في البدايه كنا عملنا الـ Read method. وكل اللي احنا محتاجينه اننا نقراها في اول الmain.go file


```go
func main() {
	fmt.Println("Listening on port :6379")

	// Create a new server
	l, err := net.Listen("tcp", ":6379")
	if err != nil {
		fmt.Println(err)
		return
	}

	aof, err := NewAof("database.aof")
	if err != nil {
		fmt.Println(err)
		return
	}
	defer aof.Close()

	aof.Read(func(value Value) {
		command := strings.ToUpper(value.array[0].bulk)
		args := value.array[1:]

		handler, ok := Handlers[command]
		if !ok {
			fmt.Println("Invalid command: ", command)
			return
		}

		handler(args)
	})

	// ...
}
```


هتلاقي ان الـكود هو هو اللي استخدمناه قبل كدا علشان نعمل run للـ commands. ولكن الفرق اننا مش بنكتب للـ aof تاني لاننا اصلا بنقرا منه

## الخاتمه

بالشكل ده احنا خلصنا الـ AOF و عرفنا ازاي نعمل persist للبيانات علي الـ disk. و خلي بالك ان ال AOF دي نفس الطريقه اللي Redis
بيستخدمها علشان يعمل persist. وممكن تقرا [المقالة دي](https://www.memurai.com/blog/redis-persistence-deep-dive) علشان تعرف تفاصيل اكتر عن الفرق بين RDB و AOF.


