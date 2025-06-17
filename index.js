require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

//middleware
app.use(cors());
app.use(express.json());

//mongo db config

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.b30s3ik.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server
    // await client.connect();

    const courseCollection = client.db("courseDB").collection("courses");
    const enrollmentCollection = client
      .db("courseDB")
      .collection("enrollments");

    app.get("/courses", async (req, res) => {
      const { creatorEmail, latest, popular } = req.query;

      if (popular === "true") {
        try {
          const topEnrollments = await enrollmentCollection
            .aggregate([
              {
                $group: {
                  _id: "$courseId",
                  count: { $sum: 1 },
                },
              },
              { $sort: { count: -1 } },
              { $limit: 6 },
            ])
            .toArray();

          const topCourseIds = topEnrollments.map(
            (item) => new ObjectId(item._id)
          );

          const popularCourses = await courseCollection
            .find({ _id: { $in: topCourseIds } })
            .toArray();

          return res.send(popularCourses);
        } catch (error) {
          console.error("Error fetching popular courses:", error);
          return res
            .status(500)
            .send({ message: "Error fetching popular courses" });
        }
      }

      let query = {};
      if (creatorEmail) {
        query.creatorEmail = creatorEmail;
      }

      const cursor = courseCollection.find(query);

      if (latest === "true") {
        cursor.sort({ createdAt: -1 }).limit(6);
      }

      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/courses/:id", async (req, res) => {
      const id = req.params.id;

      try {
        const query = { _id: new ObjectId(id) };
        const course = await courseCollection.findOne(query);

        if (!course) {
          return res.status(404).send({ message: "Course not found" });
        }

        res.send(course);
      } catch (error) {
        res.status(500).send({ message: "Invalid course ID" });
      }
    });

    app.get("/enrollments", async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).send({ message: "Email is required" });

      const enrollments = await enrollmentCollection
        .find({ userEmail: email })
        .toArray();
      res.send(enrollments);
    });

    //latest
    app.get("/courses", async (req, res) => {
      const { creatorEmail, latest, popular } = req.query;

      if (popular === "true") {
        try {
          const topEnrollments = await enrollmentCollection
            .aggregate([
              {
                $group: {
                  _id: "$courseId",
                  count: { $sum: 1 },
                },
              },
              { $sort: { count: -1 } },
              { $limit: 6 },
            ])
            .toArray();

          const topCourseIds = topEnrollments.map(
            (item) => new ObjectId(item._id)
          );

          // Fetch course details
          const popularCourses = await courseCollection
            .find({ _id: { $in: topCourseIds } })
            .toArray();

          return res.send(popularCourses);
        } catch (error) {
          console.error("Error fetching popular courses:", error);
          return res
            .status(500)
            .send({ message: "Error fetching popular courses" });
        }
      }

      let query = {};
      if (creatorEmail) {
        query.creatorEmail = creatorEmail;
      }

      const cursor = courseCollection.find(query);

      if (latest === "true") {
        cursor.sort({ createdAt: -1 }).limit(6);
      }

      const result = await cursor.toArray();
      res.send(result);
    });

    // Delete
    app.delete("/enrollments/:id", async (req, res) => {
      const id = req.params.id;
      const result = await enrollmentCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    app.post("/courses", async (req, res) => {
      const newCourse = {
        ...req.body,
        createdAt: new Date(),
      };
      console.log("Received course:", newCourse);

      const result = await courseCollection.insertOne(newCourse);
      res.send({ insertedId: result.insertedId });
    });

    app.post("/enrollments", async (req, res) => {
      const enrollment = req.body;
      console.log("Received enrollment:", enrollment);

      if (
        !enrollment.userEmail ||
        !enrollment.courseId ||
        !enrollment.courseName
      ) {
        return res.status(400).send({ message: "Missing required fields" });
      }

      enrollment.enrolledDate = new Date(); // Set enrollment date
      const result = await enrollmentCollection.insertOne(enrollment);
      res.send({ insertedId: result.insertedId });
    });

    app.post("/enrollments", async (req, res) => {
      const { userEmail, courseId } = req.body;

      const exists = await enrollmentsCollection.findOne({
        userEmail,
        courseId,
      });

      if (exists) {
        return res.status(409).json({ message: "Already enrolled" });
      }

      const result = await enrollmentsCollection.insertOne(req.body);
      res.status(201).json({ insertedId: result.insertedId });
    });

    //update -> put

    app.put("/courses/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedCourse = req.body;
      const updatedDoc = {
        $set: updatedCourse,
      };
      const result = await courseCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //Delete Operation
    app.delete("/courses/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await courseCollection.deleteOne(query);
      res.send(result);
    });

    app.delete("/enrollments/:id", async (req, res) => {
      const id = req.params.id;
      const result = await enrollmentCollection.deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        return res.status(404).send({ message: "Enrollment not found" });
      }

      res.send({ message: "Enrollment removed successfully", ...result });
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Course Station Server Starting");
});

app.listen(port, () => {
  console.log(`Course Station Server is Running on PORT ${port}`);
});
