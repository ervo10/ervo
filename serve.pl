use strict;
use IO::Socket::INET;

my $port = 3456;
my $dir  = "C:/Users/pauli/Desktop/claude kedes";

print "Trying to bind port $port...\n";
$| = 1;

my $server = IO::Socket::INET->new(
    LocalPort => $port,
    Listen    => 10,
    ReuseAddr => 1,
    Proto     => 'tcp',
) or do { print "Cannot bind port $port: $!\n"; exit 1; };

print "Serving at http://localhost:$port/\n";

while (my $client = $server->accept()) {
    my $request = <$client>;
    my ($method, $path) = ($request =~ /^(\S+)\s+(\S+)/);
    $path =~ s/\?.*//;
    $path =~ s|^/||;
    $path = 'index.html' if $path eq '';

    my $file = "$dir/$path";
    my %types = (
        html => 'text/html; charset=utf-8',
        css  => 'text/css',
        js   => 'application/javascript',
        png  => 'image/png',
        jpg  => 'image/jpeg',
        svg  => 'image/svg+xml',
        ico  => 'image/x-icon',
    );
    my ($ext) = ($path =~ /\.(\w+)$/);
    my $type = $types{lc($ext) // ''} // 'application/octet-stream';

    if (-f $file) {
        open my $fh, '<:raw', $file or next;
        local $/;
        my $body = <$fh>;
        close $fh;
        print $client "HTTP/1.0 200 OK\r\nContent-Type: $type\r\nContent-Length: " . length($body) . "\r\n\r\n$body";
    } else {
        print $client "HTTP/1.0 404 Not Found\r\nContent-Type: text/plain\r\n\r\nNot found: $path";
    }
    close $client;
}
