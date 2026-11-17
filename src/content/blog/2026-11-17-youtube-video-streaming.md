---
title: "YouTube Video Streaming: The Ingestion Layer of a Cloud Image-Recognition Pipeline"
description: "A containerized Python service that streams YouTube videos frame by frame into Kafka, built as the input stage of a Kubernetes-based image-recognition pipeline for a cloud computing course."
pubDate: 2026-11-17
sectionNav: true
tags: ["project", "Python", "Kafka", "Kubernetes", "Docker", "Cloud Computing"]
---

Every data pipeline starts with getting the data in. For a cloud computing group project, our team built a distributed system that watches YouTube videos and reports what it sees: how many vehicles, people, and animals appear on screen. My part was the front door: a containerized service that takes a YouTube link and streams the video, frame by frame, into the rest of the system.

**[View the code on GitHub](https://github.com/Kevin-Wilkes/Youtube-Video-Streaming)**

---

## The full pipeline

The system was split into independent services, each running in its own container on a Kubernetes cluster and connected through Kafka. My component is highlighted below:

```mermaid
flowchart LR
    A["YouTube video URL"] --> B["Video streaming service<br/>yt_dlp + frame formatting<br/>(my component)"]
    B --> C["Kafka broker<br/>Message queue between services"]
    C --> D["Data processing<br/>Prepares frames for analysis"]
    D --> E["Image recognition<br/>Detects vehicles, people, and animals"]
    E --> F["Statistics<br/>Reports what appeared in the video"]

    classDef mine fill:#f59e0b,stroke:#b45309,color:#111827,font-weight:bold
    class B mine
```

Because every stage communicates only through Kafka, each one can be built, deployed, and scaled on its own. That made it possible for our team to work in parallel, with each person owning a service.

---

## What my component does

Given a YouTube URL, the service:

1. **Fetches the video** using the `yt_dlp` library, which handles the work of locating and streaming the video from YouTube.
2. **Formats each frame** into a consistent, compute-friendly format so the downstream services don't have to deal with raw video encoding.
3. **Publishes the frames to Kafka**, where the processing and recognition services pick them up.

Streaming frames instead of downloading whole videos first means the downstream services can start working right away, and the pipeline never needs to hold an entire video in memory or on disk.

---

## Why Kafka?

> [!NOTE]
> **Kafka decouples the services.** The streaming service doesn't need to know anything about who reads its frames, or how fast. It writes frames to Kafka, and the recognition side reads them at its own pace. If image recognition falls behind, frames simply wait in the queue instead of being lost.

> [!TIP]
> **It also makes scaling simple.** Image recognition is the slowest step in the pipeline. With Kafka in the middle, more recognition workers can be added to share the load without changing anything about how video comes in.

---

## Containerized and ready for Kubernetes

The service is packaged to drop straight into a cluster:

- **`Dockerfile`** builds the Python service and its dependencies into a container image.
- **`component1deployment.yaml`** deploys the streaming service to Kubernetes.
- **`kafka-deployment.yaml`** deploys the Kafka broker the services communicate through.
- **`requirements.txt`** lists the Python dependencies installed into the image.

Since each piece is defined as configuration, the whole input stage can be brought up on a cluster with a couple of `kubectl apply` commands.

---

## Tech stack

- **Python** with **yt_dlp** for streaming video from YouTube
- **Apache Kafka** for messaging between services
- **Docker** for containerization
- **Kubernetes** for deployment and orchestration

---

## What I took away

This project was my first hands-on look at how real cloud systems are built: not as one big program, but as small, independent services connected by a message queue. Owning the ingestion layer meant thinking about the contract with everyone downstream, delivering frames in a format the rest of the team could rely on, regardless of what video came in.

Optimus Codeworks builds data pipelines and cloud services like this one. If you need data moving reliably from one place to another, [get in touch](/contact/).
