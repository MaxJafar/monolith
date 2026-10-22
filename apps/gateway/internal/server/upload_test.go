package server

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// A body slower than the server-wide ReadTimeout must still reach the API
// when it is a multipart upload, and must still be cut off otherwise.
func TestUploadsOutliveTheServerReadTimeout(t *testing.T) {
	received := make(chan int64, 2)
	server := httptest.NewUnstartedServer(allowUploads(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n, err := io.Copy(io.Discard, r.Body)
		if err != nil {
			w.WriteHeader(http.StatusRequestTimeout)
			received <- -1
			return
		}
		received <- n
		w.WriteHeader(http.StatusNoContent)
	})))
	server.Config.ReadTimeout = 150 * time.Millisecond
	server.Start()
	defer server.Close()

	send := func(contentType string) int64 {
		body, writer := io.Pipe()
		go func() {
			for range 3 {
				_, _ = writer.Write([]byte("chunk"))
				time.Sleep(120 * time.Millisecond)
			}
			_ = writer.Close()
		}()
		request, err := http.NewRequest(http.MethodPost, server.URL, body)
		if err != nil {
			t.Fatal(err)
		}
		request.Header.Set("Content-Type", contentType)
		if response, err := http.DefaultClient.Do(request); err == nil {
			_ = response.Body.Close()
		}
		select {
		case n := <-received:
			return n
		case <-time.After(5 * time.Second):
			t.Fatal("handler never finished")
			return 0
		}
	}

	if n := send("multipart/form-data; boundary=x"); n != 15 {
		t.Fatalf("multipart upload was cut off: read %d bytes", n)
	}
	if n := send("application/json"); n != -1 {
		t.Fatalf("slow non-upload body outlived ReadTimeout: read %d bytes", n)
	}
}
