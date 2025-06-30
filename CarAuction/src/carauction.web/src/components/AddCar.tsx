import React, { useState, useRef, useEffect } from 'react';
import { Form, Button, Alert, Row, Col, Card, CloseButton, ProgressBar, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { addCar, uploadCarImages } from '../services/api';
import { UploadResult } from '../types';
import { useToast } from './ToastProvider';
import { getAbsoluteImageUrl } from '../utils/imageHelper';
import { getCurrentGeorgianTime, georgianInputToUtcIso, utcIsoToGeorgianInput } from '../utils/dateHelpers';

const AddCar: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    year: new Date().getFullYear(),
    startPrice: '',
    fixedPrice: '',
    description: '',
    photoUrl: '', // Legacy field, kept for compatibility
    auctionStartDate: '',
    auctionEndDate: '',
    saleType: 'Auction' // Default to Auction
  });
  const [uploadedImages, setUploadedImages] = useState<UploadResult[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Initialize default Georgian time dates
  useEffect(() => {
    const georgianNow = getCurrentGeorgianTime();
    const georgianStartDate = new Date(georgianNow.getTime() + (60 * 60 * 1000)); // 1 hour from now
    const georgianEndDate = new Date(georgianNow.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days from now
    
    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatForInput = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setFormData(prev => ({
      ...prev,
      auctionStartDate: formatForInput(georgianStartDate),
      auctionEndDate: formatForInput(georgianEndDate)
    }));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    if (primaryImageIndex === index) {
      setPrimaryImageIndex(null);
    } else if (primaryImageIndex !== null && primaryImageIndex > index) {
      setPrimaryImageIndex(primaryImageIndex - 1);
    }
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    if (primaryImageIndex === index) {
      setPrimaryImageIndex(null);
    } else if (primaryImageIndex !== null && primaryImageIndex > index) {
      setPrimaryImageIndex(primaryImageIndex - 1);
    }
  };

  const setPrimaryImage = (index: number) => {
    setPrimaryImageIndex(index);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const response = await uploadCarImages(selectedFiles);
      
      // Filter only successful uploads
      const successfulUploads = response.data.filter((result: UploadResult) => result.success);
      setUploadedImages(prev => [...prev, ...successfulUploads]);
      
      // Set the first image as primary if no primary is selected yet
      if (primaryImageIndex === null && successfulUploads.length > 0) {
        setPrimaryImageIndex(0);
      }
      
      // Clear selected files
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Show success toast
      showToast('სურათები ატვირთულია', `წარმატებით ატვირთულია ${successfulUploads.length} სურათი.`, 'success');
    } catch (err: any) {
      console.error('Error uploading images:', err);
      const errorMessage = err.message || 'სურათების ატვირთვა ვერ მოხერხდა. გთხოვთ, კვლავ სცადეთ.';
      setUploadError(errorMessage);
      showToast('ატვირთვის შეცდომა', errorMessage, 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate sale type specific fields
    if (formData.saleType === 'Auction') {
      // Validate dates for auction using Georgian time
      const startDateInput = new Date(formData.auctionStartDate); // This is Georgian time from input
      const endDateInput = new Date(formData.auctionEndDate); // This is Georgian time from input
      const georgianNow = getCurrentGeorgianTime(); // Current Georgian time
      
      console.log(`Current Georgian time: ${georgianNow.toISOString()}`);
      console.log(`Start time (Georgian input): ${startDateInput.toISOString()}`);
      console.log(`End time (Georgian input): ${endDateInput.toISOString()}`);

      if (startDateInput < georgianNow) {
        setError('აუქციონის დაწყების თარიღი უნდა იყოს მომავალში (ქართული დროით)');
        setLoading(false);
        return;
      }

      if (endDateInput <= startDateInput) {
        setError('აუქციონის დასრულების თარიღი უნდა იყოს დაწყების თარიღის შემდეგ');
        setLoading(false);
        return;
      }
    } else if (formData.saleType === 'DirectSale') {
      // Validate fixed price
      if (!formData.fixedPrice || parseFloat(formData.fixedPrice) <= 0) {
        setError('გთხოვთ, შეიყვანოთ ვალიდური ფიქსირებული ფასი პირდაპირი გაყიდვისთვის');
        setLoading(false);
        return;
      }
    }

    // Check if we have at least one image
    if (uploadedImages.length === 0) {
      setError('გთხოვთ, ავირჩიოთ მინიმუმ ერთი სურათი თქვენი მანქანისა');
      setLoading(false);
      return;
    }

    // Validate that all files are uploaded
    if (selectedFiles.length > 0 && !isUploading) {
      setError('გთხოვთ, ავირჩიოთ არჩეული სურათები გაგზავნამდე');
      setLoading(false);
      return;
    }

    try {
      // Get all image URLs from the uploaded images
      const imageUrls = uploadedImages.map(img => img.url || '').filter(url => url !== '');
      
      let carData;
      
      if (formData.saleType === 'DirectSale') {
        // For direct sales, use fixed price as starting price and set default auction dates
        const now = new Date();
        const defaultEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
        
        carData = {
          ...formData,
          startPrice: parseFloat(formData.fixedPrice), // Use fixed price as starting price
          fixedPrice: parseFloat(formData.fixedPrice),
          year: Number(formData.year),
          imageUrls: imageUrls,
          primaryImageIndex: primaryImageIndex !== null ? primaryImageIndex : undefined,
          // Set default auction dates to satisfy database constraints (UTC)
          auctionStartDate: now.toISOString(),
          auctionEndDate: defaultEndDate.toISOString()
        };
      } else {
        // For auctions, convert Georgian time inputs to UTC
        carData = {
          ...formData,
          startPrice: parseFloat(formData.startPrice),
          fixedPrice: undefined, // No fixed price for auctions
          year: Number(formData.year),
          imageUrls: imageUrls,
          primaryImageIndex: primaryImageIndex !== null ? primaryImageIndex : undefined,
          // Convert Georgian time inputs to UTC ISO strings
          auctionStartDate: georgianInputToUtcIso(formData.auctionStartDate),
          auctionEndDate: georgianInputToUtcIso(formData.auctionEndDate)
        };
      }

      await addCar(carData);
      setSuccess(true);
      const successMessage = formData.saleType === 'DirectSale' 
        ? 'თქვენი მანქანა წარდგენილია პირდაპირი გაყიდვისთვის და დამტკიცების მოლოდინშია.'
        : 'თქვენი მანქანა წარდგენილია აუქციონისთვის და დამტკიცების მოლოდინშია.';
      showToast('Car Added', successMessage, 'success');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'მანქანის დამატება ვერ მოხერხდა. გთხოვთ, მოგვიანებით სცადეთ.';
      setError(errorMessage);
      showToast('შეცდომა', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4">მანქანის გაყიდვისთვის დამატება</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && (
        <Alert variant="success">
          მანქანა წარმატებით დაემატა! თქვენი მანქანა განხილული იქნება განთავსებამდე.
        </Alert>
      )}
      
      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3" controlId="formName">
              <Form.Label>მანქანის სახელი</Form.Label>
              <Form.Control
                type="text"
                name="name"
                placeholder="მაგ., Toyota Camry"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Form.Group>
          </Col>
          
          <Col md={6}>
            <Form.Group className="mb-3" controlId="formModel">
              <Form.Label>მოდელი</Form.Label>
              <Form.Control
                type="text"
                name="model"
                placeholder="მაგ., SE"
                value={formData.model}
                onChange={handleChange}
                required
              />
            </Form.Group>
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <Form.Group className="mb-3" controlId="formYear">
              <Form.Label>წელი</Form.Label>
              <Form.Control
                type="number"
                name="year"
                placeholder="წელი"
                value={formData.year}
                onChange={handleChange}
                required
              />
            </Form.Group>
          </Col>
          
          {/* Starting Price - Only show for Auction type */}
          {formData.saleType === 'Auction' && (
            <Col md={6}>
              <Form.Group className="mb-3" controlId="formStartPrice">
                <Form.Label>საწყისი ფასი ($)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="startPrice"
                  placeholder="0.00"
                  value={formData.startPrice}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
          )}
        </Row>

        {/* Sale Type Selection */}
        <Row>
          <Col md={12}>
            <Form.Group className="mb-3" controlId="formSaleType">
              <Form.Label>გაყიდვის ტიპი</Form.Label>
              <Form.Check
                type="radio"
                id="auction-type"
                name="saleType"
                value="Auction"
                label="აუქციონი - მისცეთ მომხმარებლებს შანსი ბიდი განათავსონ თქვენს მანქანაზე"
                checked={formData.saleType === 'Auction'}
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                id="direct-type"
                name="saleType"
                value="DirectSale"
                label="პირდაპირი გაყიდვა - გაყიდეთ ფიქსირებულ ფასად"
                checked={formData.saleType === 'DirectSale'}
                onChange={handleChange}
              />
            </Form.Group>
          </Col>
        </Row>

        {/* Fixed Price for Direct Sale */}
        {formData.saleType === 'DirectSale' && (
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="formFixedPrice">
                <Form.Label>ფიქსირებული ფასი ($)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="fixedPrice"
                  placeholder="0.00"
                  value={formData.fixedPrice}
                  onChange={handleChange}
                  required
                />
                <Form.Text className="text-muted">
                  This is the price buyers will pay to purchase your car immediately.
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
        )}

        <Form.Group className="mb-3">
          <Form.Label>მანქანის სურათები</Form.Label>
          <div className="mb-3">
            <input
              type="file"
              ref={fileInputRef}
              className="form-control"
              multiple
              accept="image/jpeg,image/png,image/gif"
              onChange={handleFileSelect}
            />
            <Form.Text className="text-muted">
              Upload multiple images of your car. First image will be used as the primary image.
            </Form.Text>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mb-3">
              <h6>არჩეული ფაილები:</h6>
              <Row xs={2} md={3} lg={4} className="g-3">
                {selectedFiles.map((file, index) => (
                  <Col key={`${file.name}-${index}`}>
                    <Card>
                      <Card.Img 
                        variant="top" 
                        src={URL.createObjectURL(file)} 
                        style={{ height: '100px', objectFit: 'cover' }}
                      />
                      <Card.Body className="p-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-truncate">{file.name}</small>
                          <CloseButton onClick={() => removeSelectedFile(index)} />
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
              <Button 
                variant="primary" 
                className="mt-2" 
                onClick={handleUpload} 
                disabled={isUploading || selectedFiles.length === 0}
              >
                {isUploading ? 'იტვირთება...' : 'არჩეული სურათების ატვირთვა'}
              </Button>

              {isUploading && (
                <ProgressBar 
                  now={uploadProgress} 
                  label={`${uploadProgress}%`} 
                  className="mt-2" 
                />
              )}

              {uploadError && (
                <Alert variant="danger" className="mt-2">
                  {uploadError}
                </Alert>
              )}
            </div>
          )}

          {uploadedImages.length > 0 && (
            <div className="mt-3">
              <h6>Uploaded Images:</h6>
              <Row xs={2} md={3} lg={4} className="g-3">
                {uploadedImages.map((image, index) => (
                  <Col key={image.fileName || index}>
                    <Card 
                      className={primaryImageIndex === index ? 'border-primary' : ''}
                      style={primaryImageIndex === index ? { boxShadow: '0 0 0 3px rgba(13, 110, 253, 0.3)' } : {}}
                    >
                      <div style={{ position: 'relative' }}>
                        <Card.Img 
                          variant="top" 
                          src={getAbsoluteImageUrl(image.url)} 
                          style={{ height: '100px', objectFit: 'cover' }}
                        />
                        {primaryImageIndex === index && (
                          <Badge 
                            bg="primary" 
                            pill 
                            style={{ 
                              position: 'absolute', 
                              top: '5px', 
                              right: '5px',
                              padding: '5px'
                            }}
                          >
                            Primary
                          </Badge>
                        )}
                      </div>
                      <Card.Body className="p-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <Button 
                            size="sm" 
                            variant={primaryImageIndex === index ? "primary" : "outline-primary"}
                            onClick={() => setPrimaryImage(index)}
                            className="py-0 px-1"
                          >
                            {primaryImageIndex === index ? 'Primary' : 'Set Primary'}
                          </Button>
                          <CloseButton onClick={() => removeUploadedImage(index)} />
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </Form.Group>

        <Form.Group className="mb-3" controlId="formDescription">
          <Form.Label>აღწერა</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            name="description"
            placeholder="აღწერეთ თქვენი მანქანა - მიუთითეთ მდგომარეობა, გარბენი, თვისებები და ა.შ."
            value={formData.description}
            onChange={handleChange}
            required
          />
        </Form.Group>

        {/* Auction Dates - Only show for Auction type */}
        {formData.saleType === 'Auction' && (
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="formAuctionStart">
                <Form.Label>აუქციონის დაწყების თარიღი და დრო (ქართული დრო)</Form.Label>
                <Form.Control
                  type="datetime-local"
                  name="auctionStartDate"
                  value={formData.auctionStartDate}
                  onChange={handleChange}
                  required
                />
                <Form.Text className="text-muted">
                  აუქციონი ავტომატურად გადავა "მიმდინარე" რეჟიმში ამ დროს (ქართული დრო GMT+4).
                </Form.Text>
              </Form.Group>
            </Col>
            
            <Col md={6}>
              <Form.Group className="mb-3" controlId="formAuctionEnd">
                <Form.Label>აუქციონის დასრულების თარიღი და დრო (ქართული დრო)</Form.Label>
                <Form.Control
                  type="datetime-local"
                  name="auctionEndDate"
                  value={formData.auctionEndDate}
                  onChange={handleChange}
                  required
                />
                <Form.Text className="text-muted">
                  აუქციონი ავტომატურად დასრულდება ამ დროს (ქართული დრო GMT+4).
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
        )}

        <Button variant="primary" type="submit" disabled={loading || success}>
          {loading ? 'იგზავნება...' : 'მანქანის დამატება'}
        </Button>
      </Form>
    </div>
  );
};

export default AddCar;
